import { router } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Icon } from '@/ui/components/Icon';
import { PressableScale } from '@/ui/components/PressableScale';
import { Text } from '@/ui/components/Text';
import { SceneBackground } from '@/ui/scenes';
import { useTheme } from '@/ui/ThemeProvider';
import { maxContentWidth, type ContentWidth } from '@/ui/themes/layout';

/** What `Screen` hands to a `list` renderer. */
export interface ScreenListParts {
  /** Title block + `children`: render it as the list header. */
  header: ReactElement;
  /** Screen padding for the list content. */
  contentContainerStyle: ViewStyle;
  /** Pull-to-refresh, when `onRefresh` is set. */
  refreshControl?: ReactElement<RefreshControlProps>;
}

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
  /**
   * Quiet background: the world's scene stays but holds still (play questions need focus).
   */
  plain?: boolean;
  /**
   * Render a virtualized list (FlashList) instead of the ScrollView, for unbounded lists. It gets
   * the title block + children as its header; never nest a list inside the default ScrollView.
   */
  list?: (parts: ScreenListParts) => ReactNode;
  /**
   * Content column on wide windows (iPad, desktop web): `reading` (default, ~640) for forms,
   * lists and text; `wide` (~900) for grids and boards; `full` for full-bleed screens. Widths
   * come from `theme.layout`.
   */
  width?: ContentWidth;
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
  list,
  width = 'reading',
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

  // Centered column on tablets and desktop web (phones are narrower than any max width).
  const maxWidth = maxContentWidth(width, theme.layout);
  const column: ViewStyle = { width: '100%', maxWidth, alignSelf: 'center' };
  const padding: ViewStyle = {
    padding: s.lg,
    paddingBottom: s.xxl,
    gap: s.md,
    ...column,
  };

  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={theme.colors.primary}
      colors={[theme.colors.primary]}
    />
  ) : undefined;

  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <SceneBackground animated={!plain} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {list ? (
          <View style={[styles.flex, column]}>
            {list({
              header: <View style={{ gap: s.md, paddingBottom: s.md }}>{content}</View>,
              contentContainerStyle: { padding: s.lg, paddingBottom: s.xxl },
              refreshControl,
            })}
          </View>
        ) : scroll ? (
          <ScrollView
            style={[styles.flex, Platform.OS === 'web' ? webStableGutter : undefined]}
            contentContainerStyle={[padding, styles.grow, contentStyle]}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}>
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
            <View
              style={[
                styles.footerInner,
                { gap: s.sm, maxWidth: maxWidth === undefined ? undefined : maxWidth - s.lg * 2 },
              ]}>
              {footer}
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Web: always reserve the scrollbar's gutter. Otherwise a desktop scrollbar appearing or
 * disappearing (content crossing the viewport height) changes the content width, which re-sizes
 * width-measured grids (Sudoku, word search), which changes the height again: a layout loop that
 * re-renders every cell several times per tap. No effect with overlay scrollbars (phones).
 */
const webStableGutter = { scrollbarGutter: 'stable' } as unknown as ViewStyle;

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
  footerInner: { width: '100%', alignSelf: 'center' },
});
