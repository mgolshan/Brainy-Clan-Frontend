import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { SupportMessage } from '@/api/types';
import { useIsAdmin, useMe } from '@/features/auth/hooks';
import {
  useSupportDraft,
  useSupportDraftHydrated,
  type SupportContext,
} from '@/features/support/draft';
import {
  useSendSupportMessage,
  useSupportContext,
  useSupportMessages,
} from '@/features/support/hooks';
import {
  MAX_MESSAGE_LENGTH,
  SUPPORT_TOPICS,
  codePointLength,
  firstLine,
  messageProblem,
  sendErrorKind,
  showCounter,
  statusBadge,
  topicIcon,
} from '@/features/support/model';
import { errorMessage } from '@/lib/errorMessage';
import { formatDate, formatNumber } from '@/lib/format';
import {
  Appear,
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  ErrorState,
  Icon,
  IconBubble,
  Loading,
  PressableScale,
  Screen,
  SectionHeader,
  Text,
  TextField,
  useTheme,
} from '@/ui';

/** "Sent with your message": app version, platform, device (collapsed by default). */
function ContextDisclosure({ context }: { context: SupportContext }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const rows: [string, string][] = [
    [t('support.context.appVersion'), context.app_version],
    [t('support.context.platform'), t(`support.platforms.${context.platform}`)],
    [t('support.context.device'), context.device ?? t('support.context.unknown')],
  ];
  return (
    <View
      style={{
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surfaceAlt,
        paddingHorizontal: theme.spacing.md,
      }}>
      <PressableScale
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={t('support.context.title')}
        accessibilityHint={open ? t('support.context.hideHint') : t('support.context.showHint')}
        accessibilityState={{ expanded: open }}
        style={[styles.row, { minHeight: theme.touchTarget, gap: theme.spacing.sm }]}>
        <Icon name="information-circle-outline" color={theme.colors.textMuted} />
        <Text variant="label" weight="bold" style={styles.flex}>
          {t('support.context.title')}
        </Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} color={theme.colors.textMuted} />
      </PressableScale>
      {open ? (
        <View style={{ gap: theme.spacing.xs, paddingBottom: theme.spacing.md }}>
          {rows.map(([label, value]) => (
            <Text key={label} variant="caption" tone="muted">
              <Text variant="caption" weight="bold" tone="muted">
                {label}
              </Text>
              {`  ${value}`}
            </Text>
          ))}
          <Text variant="caption" tone="subtle">
            {t('support.context.note')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Topic chips, message field, reply note, context and Send (with retry / errors). */
function SupportForm({
  email,
  context,
  onSent,
}: {
  email: string | null;
  context: SupportContext;
  onSent: (message: SupportMessage) => void;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const topic = useSupportDraft((s) => s.topic);
  const message = useSupportDraft((s) => s.message);
  const setTopic = useSupportDraft((s) => s.setTopic);
  const setMessage = useSupportDraft((s) => s.setMessage);
  const send = useSendSupportMessage();
  const [touched, setTouched] = useState(false);

  const problem = messageProblem(message);
  const length = codePointLength(message.trim());
  const fieldError =
    problem === 'tooLong'
      ? t('support.tooLong', { max: formatNumber(MAX_MESSAGE_LENGTH, i18n.language) })
      : problem === 'tooShort' && touched
        ? t('support.tooShort')
        : undefined;
  const canSend = !!topic && problem === null && !send.isPending;
  const errorKind = send.error ? sendErrorKind(send.error) : null;

  const submit = () => {
    if (!canSend) return;
    send.mutate(context, { onSuccess: onSent });
  };

  const errorText =
    errorKind === 'network'
      ? t('support.errorNetwork')
      : errorKind === 'rate_limited'
        ? t('support.rateLimited')
        : errorKind === 'forbidden'
          ? t('support.forbidden')
          : send.error
            ? errorMessage(send.error, t)
            : null;

  return (
    <Card padding="lg" style={{ gap: theme.spacing.md }}>
      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="label" tone="muted" accessibilityRole="header">
          {t('support.topicLabel')}
        </Text>
        <View style={styles.wrap}>
          {SUPPORT_TOPICS.map(({ key, icon }) => (
            <Chip
              key={key}
              label={t(`support.topics.${key}`)}
              icon={icon}
              selected={topic === key}
              onPress={() => setTopic(key)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: theme.spacing.xs }}>
        <TextField
          label={t('support.messageLabel')}
          placeholder={t('support.messagePlaceholder')}
          hint={t('support.messageHint')}
          error={fieldError}
          value={message}
          onChangeText={setMessage}
          onBlur={() => setTouched(true)}
          editable={!send.isPending}
          multiline
          minLines={6}
          autoCapitalize="sentences"
          testID="support-message"
        />
        {showCounter(message) ? (
          <Text
            variant="caption"
            tone={length > MAX_MESSAGE_LENGTH ? 'danger' : 'muted'}
            align="right"
            accessibilityLiveRegion="polite"
            testID="support-counter">
            {t('support.counter', {
              count: formatNumber(length, i18n.language),
              max: formatNumber(MAX_MESSAGE_LENGTH, i18n.language),
            })}
          </Text>
        ) : null}
      </View>

      <View style={[styles.row, { gap: theme.spacing.sm, alignItems: 'flex-start' }]}>
        <Icon name="mail-outline" color={theme.colors.primary} />
        <Text style={styles.flex} testID="support-reply-note">
          {email ? t('support.replyNote', { email }) : t('support.replyNoteNoEmail')}
        </Text>
      </View>

      <ContextDisclosure context={context} />

      {errorText ? (
        <View
          style={[styles.row, { gap: theme.spacing.sm, alignItems: 'flex-start' }]}
          accessibilityLiveRegion="assertive"
          testID="support-error">
          <Icon
            name={errorKind === 'network' ? 'cloud-offline-outline' : 'alert-circle-outline'}
            color={errorKind === 'rate_limited' ? theme.colors.warning : theme.colors.danger}
          />
          <Text tone={errorKind === 'rate_limited' ? 'default' : 'danger'} style={styles.flex}>
            {errorText}
          </Text>
        </View>
      ) : null}

      <Button
        title={errorKind === 'network' ? t('support.retry') : t('support.send')}
        icon={errorKind === 'network' ? 'refresh' : 'send'}
        loading={send.isPending}
        disabled={!canSend}
        accessibilityHint={!topic ? t('support.chooseTopicHint') : undefined}
        onPress={submit}
        testID="support-send"
      />
    </Card>
  );
}

/** Thank-you card after sending. */
function SentCard({ email, onAnother }: { email: string | null; onAnother: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Appear>
      <Card padding="lg" style={{ gap: theme.spacing.md, alignItems: 'center' }}>
        <IconBubble color={theme.colors.success} size={64}>
          <Icon name="checkmark-circle" size={36} color={theme.colors.success} />
        </IconBubble>
        <Text
          variant="title"
          align="center"
          accessibilityRole="header"
          accessibilityLiveRegion="polite">
          {t('support.sentTitle')}
        </Text>
        <Text tone="muted" align="center" testID="support-sent-body">
          {email ? t('support.sentBody', { email }) : t('support.sentBodyNoEmail')}
        </Text>
        <Button
          title={t('support.writeAnother')}
          variant="outline"
          icon="create-outline"
          onPress={onAnother}
        />
      </Card>
    </Appear>
  );
}

/** One row of "Your messages": topic, first line, date, status badge. */
export function SupportMessageRow({ message }: { message: SupportMessage }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const badge = statusBadge(message.status);
  const topicLabel = t(`support.topics.${message.topic}`, {
    defaultValue: t('support.topics.other'),
  });
  const date = formatDate(message.created_at, i18n.language);
  const status = t(badge.labelKey);
  const answered =
    message.answered_at && message.status !== 'open'
      ? t('support.answeredOn', { date: formatDate(message.answered_at, i18n.language) })
      : null;
  return (
    <View
      accessible
      accessibilityLabel={[topicLabel, firstLine(message.message), date, status, answered]
        .filter(Boolean)
        .join(', ')}
      style={[styles.row, { gap: theme.spacing.sm, paddingVertical: theme.spacing.sm }]}
      testID={`support-message-${message.id}`}>
      <IconBubble size={40}>
        <Icon name={topicIcon(message.topic)} color={theme.colors.primary} />
      </IconBubble>
      <View style={[styles.flex, { gap: 2 }]}>
        <Text variant="caption" tone="muted" weight="bold">
          {topicLabel}
        </Text>
        <Text weight="bold" numberOfLines={2}>
          {firstLine(message.message)}
        </Text>
        <View style={[styles.wrap, { alignItems: 'center', marginTop: theme.spacing.xs }]}>
          <Badge label={status} tone={badge.tone} icon={badge.icon} />
          <Text variant="caption" tone="subtle">
            {date}
          </Text>
        </View>
        {answered ? (
          <Text variant="caption" tone="muted">
            {answered}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** "Your messages": the admin's messages with their status. */
function SupportMessages({ query }: { query: ReturnType<typeof useSupportMessages> }) {
  const { t } = useTranslation();
  if (query.isPending) return <Loading fill={false} />;
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }
  if (query.data.length === 0) {
    return (
      <Card>
        <EmptyState
          title={t('support.emptyTitle')}
          body={t('support.emptyBody')}
          icon="chatbubbles-outline"
          emoji="💌"
        />
      </Card>
    );
  }
  return (
    <Card padding="sm">
      {query.data.map((message, i) => (
        <View key={message.id}>
          {i > 0 ? <Divider /> : null}
          <SupportMessageRow message={message} />
        </View>
      ))}
    </Card>
  );
}

/**
 * Contact support (family admins): write to the Brainy Clan team and follow the answers. Staff
 * reply by email to the admin's account address; the draft survives leaving the screen.
 */
export function ContactSupportScreen() {
  const { t } = useTranslation();
  const me = useMe().data;
  const isAdmin = useIsAdmin();
  const hydrated = useSupportDraftHydrated();
  const claim = useSupportDraft((s) => s.claim);
  const context = useSupportContext();
  const messages = useSupportMessages(isAdmin);
  const [sent, setSent] = useState<SupportMessage | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const userId = me?.user.id;

  useEffect(() => {
    if (hydrated && userId !== undefined) claim(userId);
  }, [hydrated, userId, claim]);

  if (!me) return <Loading />;

  if (!isAdmin) {
    return (
      <Screen title={t('support.title')} back>
        <Card>
          <EmptyState
            title={t('support.adminsOnlyTitle')}
            body={me.policy.is_child ? t('support.askParent') : t('support.askAdmin')}
            icon="people-outline"
            emoji="🙋"
          />
        </Card>
      </Screen>
    );
  }

  const refresh = () => {
    setRefreshing(true);
    void messages.refetch().finally(() => setRefreshing(false));
  };

  return (
    <Screen
      title={t('support.title')}
      subtitle={t('support.subtitle')}
      back
      onRefresh={refresh}
      refreshing={refreshing}>
      {!hydrated ? (
        <Loading fill={false} />
      ) : sent ? (
        <SentCard email={me.user.email} onAnother={() => setSent(null)} />
      ) : (
        <SupportForm email={me.user.email} context={context} onSent={setSent} />
      )}
      <SectionHeader title={t('support.yourMessages')} />
      <SupportMessages query={messages} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
