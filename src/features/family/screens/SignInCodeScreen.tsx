import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share, StyleSheet, View } from 'react-native';

import type { Member, SignInCode } from '@/api/types';
import { useIsAdmin } from '@/features/auth/hooks';
import { useFamily, useIssueSignInCode } from '@/features/family/hooks';
import { useNow } from '@/features/goals/time';
import { groupCode } from '@/lib/code';
import { errorMessage } from '@/lib/errorMessage';
import { formatClock } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import {
  Appear,
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconBubble,
  Loading,
  Screen,
  Text,
  useTheme,
} from '@/ui';

/** Longest life the contract gives a sign-in code; caps the countdown if the clocks disagree. */
const MAX_TTL_MS = 15 * 60_000;

/**
 * When the code stops working, on this device's clock. Measured from when we received it, so a
 * phone whose clock is off by a few minutes still shows a sensible countdown.
 */
function deadlineFor(code: SignInCode, receivedAt: number): number {
  const ttl = new Date(code.expires_at).getTime() - receivedAt;
  if (!Number.isFinite(ttl)) return receivedAt + MAX_TTL_MS;
  return receivedAt + Math.min(Math.max(ttl, 0), MAX_TTL_MS);
}

function Step({ index, text }: { index: number; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.step}>
      <IconBubble size={32}>
        <Text weight="bold" color={theme.colors.primary}>
          {index}
        </Text>
      </IconBubble>
      <Text style={styles.flex}>{text}</Text>
    </View>
  );
}

interface Issued {
  code: SignInCode;
  receivedAt: number;
}

function CodeView({
  member,
  issued,
  onNewCode,
  renewing,
}: {
  member: Member;
  issued: Issued;
  onNewCode: () => void;
  renewing: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const now = useNow(1000);
  // Remember which code was copied, so a new code shows "Copy" again.
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { code, receivedAt } = issued;
  const deadline = useMemo(() => deadlineFor(code, receivedAt), [code, receivedAt]);
  const left = deadline - now;
  const expired = left <= 0;
  const grouped = groupCode(code.code);
  const copied = copiedCode === code.code;
  const status = expired
    ? t('signInCode.expired')
    : t('signInCode.expiresIn', { time: formatClock(left) });

  return (
    <View style={{ gap: theme.spacing.md }}>
      <Appear>
        <Card variant="hero" padding="lg" style={styles.codeCard}>
          <Avatar avatar={member.avatar} size={64} />
          <Text tone="onPrimary" weight="bold" align="center">
            {t('signInCode.codeFor', { name: member.nickname })}
          </Text>
          <Text
            variant="display"
            tone="onPrimary"
            align="center"
            selectable
            accessibilityLabel={code.code.split('').join(' ')}
            style={[
              styles.code,
              { fontFamily: theme.fonts.display },
              expired ? styles.expiredCode : null,
            ]}>
            {grouped}
          </Text>
          <Text tone="onPrimary" align="center" weight="bold">
            {status}
          </Text>
        </Card>
      </Appear>

      {!expired ? (
        <>
          <Card padding="lg" style={styles.steps}>
            <Text variant="title">{t('signInCode.howToTitle')}</Text>
            <Step index={1} text={t('signInCode.step1')} />
            <Step index={2} text={t('signInCode.step2')} />
            <Step index={3} text={t('signInCode.step3')} />
          </Card>
          <Button
            title={t('signInCode.share')}
            icon="share-outline"
            onPress={() =>
              void Share.share({
                message: t('signInCode.shareMessage', { name: member.nickname, code: grouped }),
              }).catch(() => undefined)
            }
          />
          <Button
            title={copied ? t('signInCode.copied') : t('signInCode.copy')}
            icon={copied ? 'checkmark' : 'copy-outline'}
            variant="outline"
            onPress={() =>
              void Clipboard.setStringAsync(code.code).then(() => setCopiedCode(code.code))
            }
          />
        </>
      ) : null}
      <Button
        title={t('signInCode.newCode')}
        icon="refresh-outline"
        variant={expired ? 'primary' : 'secondary'}
        loading={renewing}
        onPress={onNewCode}
      />
      <Text variant="caption" tone="muted" align="center">
        {t('signInCode.newCodeHint')}
      </Text>
      <Button title={t('common.done')} variant="ghost" onPress={() => goBack()} />
    </View>
  );
}

/**
 * Admin: issue a one-time sign-in code so a member (typically a child without email) can sign in
 * on another device (`POST /family/members/{member}/sign-in-codes`). Big grouped code, live
 * countdown, share / copy, and "New code" (which voids the previous one server-side).
 */
export function SignInCodeScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isAdmin = useIsAdmin();
  const family = useFamily();
  const memberId = Number(id);
  const issue = useIssueSignInCode(memberId);
  const [issued, setIssued] = useState<Issued | null>(null);

  const create = () =>
    issue.mutate(undefined, {
      onSuccess: (code) => setIssued({ code, receivedAt: Date.now() }),
    });

  if (family.isPending) return <Loading />;
  if (family.isError) {
    return (
      <Screen back>
        <ErrorState error={family.error} onRetry={() => void family.refetch()} />
      </Screen>
    );
  }
  const member = family.data.members.find((m) => m.id === memberId);
  if (!member || !isAdmin) {
    return (
      <Screen back>
        <EmptyState title={t('errors.notFound')} emoji="🔍" icon="search-outline" />
      </Screen>
    );
  }

  return (
    <Screen title={t('signInCode.title')} back>
      {issued ? (
        <CodeView member={member} issued={issued} onNewCode={create} renewing={issue.isPending} />
      ) : (
        <Card padding="lg" style={styles.intro}>
          <Avatar avatar={member.avatar} size={80} />
          <Text variant="title" align="center">
            {member.nickname}
          </Text>
          <Text tone="muted" align="center">
            {t('signInCode.intro', { name: member.nickname })}
          </Text>
          <Button
            title={t('signInCode.create')}
            icon="key-outline"
            size="lg"
            loading={issue.isPending}
            onPress={create}
          />
        </Card>
      )}
      {issue.error ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {errorMessage(issue.error, t)}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: { alignItems: 'center', gap: 12 },
  codeCard: { alignItems: 'center', gap: 10 },
  code: { letterSpacing: 6, fontSize: 44, lineHeight: 56 },
  expiredCode: { opacity: 0.4, textDecorationLine: 'line-through' },
  steps: { gap: 12 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
