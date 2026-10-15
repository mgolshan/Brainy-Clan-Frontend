import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { SocialProvider } from '@/api/types';
import {
  useLinkSocialAccount,
  useSocialAccounts,
  useUnlinkSocialAccount,
} from '@/features/auth/social/api';
import { AppleButton } from '@/features/auth/social/AppleButton';
import { FacebookLogo, GoogleLogo } from '@/features/auth/social/BrandLogos';
import { PROVIDER_NAMES } from '@/features/auth/social/config';
import { useSocialProviders } from '@/features/auth/social/useSocialProviders';
import { errorMessage } from '@/lib/errorMessage';
import { formatRelative } from '@/lib/format';
import { Button, Card, Divider, ErrorState, Icon, SectionHeader, Text, useTheme } from '@/ui';
import { brandColors } from '@/ui/brand';

const ORDER: SocialProvider[] = ['apple', 'google', 'facebook'];

/**
 * Provider mark on a neutral tile: Google's "G" on white, Facebook's logo in its blue, Apple's
 * logo in white on black.
 */
function ProviderMark({ provider }: { provider: SocialProvider }) {
  const theme = useTheme();
  if (provider === 'apple') {
    return (
      <View
        style={[
          styles.mark,
          {
            borderRadius: theme.radius.sm,
            backgroundColor: brandColors.apple.black,
            borderColor: theme.colors.border,
          },
        ]}>
        <Icon name="logo-apple" size={24} color={brandColors.apple.white} />
      </View>
    );
  }
  return (
    <View
      style={[
        styles.mark,
        {
          borderRadius: theme.radius.sm,
          backgroundColor: brandColors.google.light.fill,
          borderColor: theme.colors.border,
        },
      ]}>
      {provider === 'google' ? (
        <GoogleLogo size={22} />
      ) : (
        <FacebookLogo size={24} color={brandColors.facebook.fill} />
      )}
    </View>
  );
}

/**
 * Profile -> "Sign-in methods" (adults only; the caller decides from the policy): linked
 * Apple/Google/Facebook accounts with Connect / Disconnect (Apple's own button for connecting). Disconnecting the only way to sign in
 * answers 409 `last_sign_in_method`, shown as a message. Hidden when nothing can be shown.
 */
export function SignInMethods() {
  const { t, i18n } = useTranslation();
  const accounts = useSocialAccounts();
  const providers = useSocialProviders();
  const link = useLinkSocialAccount();
  const unlink = useUnlinkSocialAccount();
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [confirming, setConfirming] = useState<SocialProvider | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: 'danger' | 'success' } | null>(null);

  const linked = accounts.data ?? [];
  const rows = ORDER.filter(
    (p) => linked.some((a) => a.provider === p) || providers.some((s) => s.provider === p),
  );
  if (accounts.isSuccess && rows.length === 0) return null;
  if (!accounts.isSuccess && providers.length === 0) return null;

  const connect = (provider: SocialProvider) => {
    const source = providers.find((s) => s.provider === provider);
    if (!source) return;
    setMessage(null);
    setConfirming(null);
    setBusy(provider);
    // Synchronous from the tap so the web popup isn't blocked.
    source
      .getToken()
      .then((credential) => {
        if (!credential) {
          setBusy(null);
          return;
        }
        link.mutate(
          { provider, credential },
          {
            onSuccess: () =>
              setMessage({
                text: t('signInMethods.connectedToast', { provider: PROVIDER_NAMES[provider] }),
                tone: 'success',
              }),
            onError: (error) => setMessage({ text: errorMessage(error, t), tone: 'danger' }),
            onSettled: () => setBusy(null),
          },
        );
      })
      .catch(() => {
        setBusy(null);
        setMessage({
          text: t('social.failed', { provider: PROVIDER_NAMES[provider] }),
          tone: 'danger',
        });
      });
  };

  const disconnect = (provider: SocialProvider) => {
    if (confirming !== provider) {
      setConfirming(provider);
      setMessage(null);
      return;
    }
    setConfirming(null);
    setBusy(provider);
    unlink.mutate(provider, {
      onError: (error) => setMessage({ text: errorMessage(error, t), tone: 'danger' }),
      onSettled: () => setBusy(null),
    });
  };

  return (
    <>
      <SectionHeader title={t('signInMethods.title')} />
      <Card padding="lg" style={styles.card}>
        <Text variant="caption" tone="muted">
          {t('signInMethods.hint')}
        </Text>
        {accounts.isError ? (
          <ErrorState error={accounts.error} onRetry={() => void accounts.refetch()} />
        ) : null}
        {rows.map((provider, i) => {
          const account = linked.find((a) => a.provider === provider);
          const canConnect = providers.some((s) => s.provider === provider && s.ready);
          return (
            <View key={provider} style={styles.block}>
              {i > 0 ? <Divider /> : null}
              <View style={styles.row}>
                <ProviderMark provider={provider} />
                <View style={styles.text}>
                  <Text weight="bold">{PROVIDER_NAMES[provider]}</Text>
                  <Text variant="caption" tone="muted" numberOfLines={2}>
                    {account
                      ? [
                          account.email,
                          `${t('signInMethods.connected')} ${formatRelative(account.linked_at, i18n.language)}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      : accounts.isSuccess
                        ? t('signInMethods.notConnected')
                        : ' '}
                  </Text>
                  {/* Under the text, so a long email or French label isn't squeezed on a phone. */}
                  <View style={styles.action}>
                    {!accounts.isSuccess ? null : account ? (
                      <Button
                        title={
                          confirming === provider
                            ? t('signInMethods.confirmDisconnect')
                            : t('signInMethods.disconnect')
                        }
                        size="sm"
                        variant={confirming === provider ? 'danger' : 'outline'}
                        fullWidth={false}
                        loading={busy === provider}
                        disabled={busy !== null && busy !== provider}
                        onPress={() => disconnect(provider)}
                      />
                    ) : provider === 'apple' ? (
                      <AppleButton
                        fullWidth={false}
                        loading={busy === provider}
                        disabled={!canConnect || (busy !== null && busy !== provider)}
                        onPress={() => connect(provider)}
                      />
                    ) : (
                      <Button
                        title={t('signInMethods.connect')}
                        size="sm"
                        variant="outline"
                        fullWidth={false}
                        loading={busy === provider}
                        disabled={!canConnect || (busy !== null && busy !== provider)}
                        accessibilityLabel={`${t('signInMethods.connect')} ${PROVIDER_NAMES[provider]}`}
                        onPress={() => connect(provider)}
                      />
                    )}
                  </View>
                </View>
              </View>
            </View>
          );
        })}
        {message ? (
          <Text variant="caption" tone={message.tone} accessibilityLiveRegion="polite">
            {message.text}
          </Text>
        ) : null}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  block: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mark: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  text: { flex: 1, gap: 2 },
  action: { alignSelf: 'flex-start', marginTop: 6 },
});
