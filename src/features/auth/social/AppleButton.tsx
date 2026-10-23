import * as AppleAuthentication from 'expo-apple-authentication';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '@/ui';
import { brandColors } from '@/ui/brand';

interface AppleButtonProps {
  onPress: () => void;
  /** "Continue with Apple" (default) or "Sign in with Apple". */
  type?: 'continue' | 'signIn';
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to the parent's width (sign-in screens) or a fixed compact width (Profile row). */
  fullWidth?: boolean;
}

/**
 * Apple's own button (`ASAuthorizationAppleIDButton`, localized by iOS), as App Review requires.
 * Style per Apple's rules: black on light backgrounds, white on dark. Height follows the theme's
 * touch target (Apple's minimum is 30 pt); corner radius comes from the theme, clamped to Apple's
 * allowed range (square up to a capsule: 0 … height / 2). Only render when the Apple source is
 * available (iOS build with `isAvailableAsync()` true).
 */
export function AppleButton({
  onPress,
  type = 'continue',
  loading,
  disabled,
  fullWidth = true,
}: AppleButtonProps) {
  const theme = useTheme();
  const height = Math.max(theme.touchTarget, 44);
  const themeRadius = theme.vibe === 'kid' ? theme.radius.pill : theme.radius.md;
  const cornerRadius = Math.min(Math.max(themeRadius, 0), height / 2);
  const dark = theme.scheme === 'dark';
  const inactive = !!(disabled || loading);

  return (
    <View
      pointerEvents={inactive ? 'none' : 'auto'}
      accessibilityState={{ disabled: inactive, busy: !!loading }}
      style={[
        fullWidth ? styles.full : styles.compact,
        { height, opacity: disabled && !loading ? 0.5 : 1 },
      ]}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={
          type === 'signIn'
            ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            : AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
        }
        buttonStyle={
          dark
            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
        }
        cornerRadius={cornerRadius}
        style={styles.button}
        onPress={onPress}
      />
      {loading ? (
        <View style={[StyleSheet.absoluteFill, styles.spinner]}>
          <ActivityIndicator color={dark ? brandColors.apple.black : brandColors.apple.white} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  compact: { width: 220 },
  button: { width: '100%', height: '100%' },
  spinner: { alignItems: 'flex-end', justifyContent: 'center', paddingRight: 16 },
});
