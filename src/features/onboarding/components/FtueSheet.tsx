import type { ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, Text as RNText, View } from 'react-native';

import { Card, Icon, IconBubble, Text, useTheme, type IconName } from '@/ui';

/**
 * The FTUE sheets' shell (welcome, chat mode, end of year, what's new): a centered card over
 * the dimmed screen, scrollable for large text, closed by the system back gesture too.
 * No animation with reduced motion.
 */
export function FtueSheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Modal
      visible
      transparent
      animationType={theme.reducedMotion ? 'none' : 'fade'}
      onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Card padding="lg" style={[styles.sheet, { gap: theme.spacing.md }]}>
            <Text variant="heading" accessibilityRole="header" style={styles.center}>
              {title}
            </Text>
            {children}
            <View style={{ gap: theme.spacing.sm }}>{footer}</View>
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
}

/** One highlight row: an emoji (kid worlds) or icon bubble, a title and an optional line. */
export function FeatureRow({
  emoji,
  icon,
  title,
  body,
}: {
  emoji: string;
  icon: IconName;
  title: string;
  body?: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[styles.row, { gap: theme.spacing.md }]}
      accessible
      accessibilityLabel={body ? `${title}. ${body}` : title}>
      <IconBubble size={theme.touchTarget}>
        {theme.emojiIcons ? (
          <RNText style={styles.emoji}>{emoji}</RNText>
        ) : (
          <Icon name={icon} color={theme.colors.primary} />
        )}
      </IconBubble>
      <View style={styles.flex}>
        <Text weight="bold">{title}</Text>
        {body ? (
          <Text variant="caption" tone="muted">
            {body}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  emoji: { fontSize: 26 },
});
