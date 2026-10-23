import { GoogleSans_500Medium } from '@expo-google-fonts/google-sans';
import { useFonts } from 'expo-font';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text as RNText, View } from 'react-native';

import type { SocialProvider } from '@/api/types';
import { FacebookLogo, GoogleLogo } from '@/features/auth/social/BrandLogos';
import { PROVIDER_NAMES } from '@/features/auth/social/config';
import { PressableScale, fontFor, useTheme } from '@/ui';
import { brandColors } from '@/ui/brand';

interface SocialButtonProps {
  /** Apple uses its own native button (AppleButton). */
  provider: Exclude<SocialProvider, 'apple'>;
  onPress: () => void;
  /** Overrides "Continue with …" (always keep the provider name in it). */
  title?: string;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Branded "Continue with Google / Facebook" button. Colors, logo and (for Google) the Google Sans
 * Medium label follow the providers' guidelines; height, corner shape, text size and press
 * feedback come from the active theme (pill in playful, rounded rectangle elsewhere; classic
 * keeps its large touch target and text scale).
 */
export function SocialButton({ provider, onPress, title, loading, disabled }: SocialButtonProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [googleFontLoaded] = useFonts({ GoogleSans_500Medium });
  const name = PROVIDER_NAMES[provider];
  const label = title ?? t('social.continueWith', { provider: name });

  const google = theme.scheme === 'dark' ? brandColors.google.dark : brandColors.google.light;
  const isGoogle = provider === 'google';
  const fill = isGoogle ? google.fill : brandColors.facebook.fill;
  const textColor = isGoogle ? google.text : brandColors.facebook.text;
  const size = theme.type.bodyLarge.size;
  const logoSize = Math.round(Math.min(Math.max(size + 2, 18), 26));
  const radius = theme.vibe === 'kid' ? theme.radius.pill : theme.radius.md;
  const fontFamily =
    isGoogle && googleFontLoaded ? 'GoogleSans_500Medium' : fontFor(theme, 'bodyLarge', 'bold');

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      haptic
      style={[
        styles.button,
        {
          minHeight: Math.max(theme.touchTarget, 44),
          borderRadius: radius,
          backgroundColor: fill,
          borderWidth: isGoogle ? 1 : 0,
          borderColor: isGoogle ? google.stroke : 'transparent',
          paddingHorizontal: theme.spacing.md,
          opacity: disabled ? 0.5 : 1,
        },
      ]}>
      <View style={[styles.logo, { width: logoSize + 4 }]}>
        {isGoogle ? <GoogleLogo size={logoSize} /> : <FacebookLogo size={logoSize} />}
      </View>
      <View style={styles.labelWrap}>
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <RNText
            numberOfLines={2}
            style={{
              textAlign: 'center',
              color: textColor,
              fontFamily,
              fontSize: size,
              lineHeight: Math.round(size * 1.35),
            }}>
            {label}
          </RNText>
        )}
      </View>
      {/* Balances the logo so the label stays centered. */}
      <View style={{ width: logoSize + 4 }} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  logo: { alignItems: 'center', justifyContent: 'center' },
  labelWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
