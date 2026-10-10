import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { withAlpha } from '@/ui/components/Card';
import { Icon } from '@/ui/components/Icon';
import { PressableScale } from '@/ui/components/PressableScale';
import { Text } from '@/ui/components/Text';
import { useTheme } from '@/ui/ThemeProvider';

export interface ScreenProps {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
  /** Show a back button (router.back). */
  back?: boolean;
  /** Called instead of router.back(). */
  onBack?: () => void;
  headerRight?: ReactNode;
  /** Pinned below the scroll area (primary actions). */
  footer?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  /** Hide the decorative background (play screen draws its own). */
  plain?: boolean;
}

/** Concentric translucent circles: a cheap radial glow that works on every platform. */
function Glow({
  color,
  size,
  strength,
  ...pos
}: {
  color: string;
  size: number;
  strength: number;
  top?: number;
  left?: number;
  right?: number;
}) {
  const rings = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2];
  return (
    <View style={[styles.glowBox, { width: size, height: size }, pos]}>
      {rings.map((r) => (
        <View
          key={r}
          style={[
            styles.blob,
            {
              width: size * r,
              height: size * r,
              top: (size - size * r) / 2,
              left: (size - size * r) / 2,
              backgroundColor: withAlpha(color, 0.035 * strength),
            },
          ]}
        />
      ))}
    </View>
  );
}

/** Decorative per-theme backdrop: candy bubbles (playful), aurora glow (sleek). */
function Backdrop() {
  const theme = useTheme();
  const c = theme.colors;
  if (theme.key === 'playful') {
    const a = theme.scheme === 'dark' ? 0.22 : 0.3;
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View
          style={[
            styles.blob,
            {
              width: 220,
              height: 220,
              top: -90,
              right: -70,
              backgroundColor: withAlpha(c.accent, a),
            },
          ]}
        />
        <View
          style={[
            styles.blob,
            {
              width: 140,
              height: 140,
              top: 40,
              left: -70,
              backgroundColor: withAlpha(c.secondary, a * 0.7),
            },
          ]}
        />
        <View
          style={[
            styles.blob,
            {
              width: 90,
              height: 90,
              top: 150,
              right: 30,
              backgroundColor: withAlpha(c.primary, a * 0.5),
            },
          ]}
        />
      </View>
    );
  }
  if (theme.key === 'sleek') {
    // Soft aurora lights faked with stacked translucent circles. (Large LinearGradients here
    // stalled react-native-web's layout pass, so the backdrop stays plain Views.)
    const strength = theme.scheme === 'dark' ? 1 : 0.45;
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Glow color={c.gradient[0]} size={520} top={-300} left={-200} strength={strength} />
        <Glow
          color={c.gradient[c.gradient.length - 1]}
          size={420}
          top={-260}
          right={-180}
          strength={strength * 0.7}
        />
      </View>
    );
  }
  return null;
}

/** Themed screen: safe area, background, title block, optional scroll/back/footer. */
export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
  back,
  onBack,
  headerRight,
  footer,
  onRefresh,
  refreshing = false,
  edges = ['top'],
  contentStyle,
  plain,
}: ScreenProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const s = theme.spacing;

  const header =
    title || back || headerRight ? (
      <View style={[styles.header, { gap: s.xs }]}>
        {back || headerRight ? (
          <View style={styles.headerRow}>
            {back ? (
              <PressableScale
                onPress={
                  onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))
                }
                accessibilityRole="button"
                accessibilityLabel={t('common.back')}
                hitSlop={8}
                style={[
                  styles.backButton,
                  {
                    width: theme.touchTarget - 4,
                    height: theme.touchTarget - 4,
                    borderRadius:
                      theme.key === 'classic' ? theme.radius.md : (theme.touchTarget - 4) / 2,
                    backgroundColor: theme.colors.surface,
                    borderColor:
                      theme.key === 'classic' ? theme.colors.borderStrong : theme.colors.border,
                    borderWidth: theme.borderWidth,
                  },
                ]}>
                <Icon name="chevron-back" color={theme.colors.text} />
              </PressableScale>
            ) : (
              <View />
            )}
            {headerRight}
          </View>
        ) : null}
        {title ? (
          <Text
            variant={theme.key === 'classic' ? 'heading' : 'display'}
            accessibilityRole="header">
            {title}
          </Text>
        ) : null}
        {subtitle ? <Text tone="muted">{subtitle}</Text> : null}
        {title && theme.key === 'classic' ? (
          <View style={[styles.rule, { backgroundColor: theme.colors.accent }]} />
        ) : null}
      </View>
    ) : null;

  const content = (
    <>
      {header}
      {children}
    </>
  );

  // Phone-width column on tablets and desktop web.
  const padding: ViewStyle = {
    padding: s.lg,
    paddingBottom: s.xxl,
    gap: s.md,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  };

  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      {plain ? null : <Backdrop />}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[padding, styles.grow, contentStyle]}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.colors.primary}
                  colors={[theme.colors.primary]}
                />
              ) : undefined
            }>
            {content}
          </ScrollView>
        ) : (
          <View style={[styles.flex, padding, contentStyle]}>{content}</View>
        )}
        {footer ? (
          <View
            style={[
              styles.footer,
              {
                paddingHorizontal: s.lg,
                paddingVertical: s.md,
                gap: s.sm,
                borderTopColor: theme.colors.border,
                backgroundColor: theme.colors.background,
              },
            ]}>
            <View style={[styles.footerInner, { gap: s.sm }]}>{footer}</View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  header: { marginBottom: 4 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: { alignItems: 'center', justifyContent: 'center' },
  rule: { height: 3, width: 56, marginTop: 6, borderRadius: 2 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
  footerInner: { width: '100%', maxWidth: 592, alignSelf: 'center' },
  blob: { position: 'absolute', borderRadius: 999 },
  glowBox: { position: 'absolute' },
});
