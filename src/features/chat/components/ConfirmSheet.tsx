import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Text, useTheme, type ButtonVariant, type IconName } from '@/ui';

interface ConfirmSheetProps {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Confirm button look (default: danger + trash, for deleting). */
  confirmVariant?: ButtonVariant;
  confirmIcon?: IconName;
  /** Optional extra action (e.g. "Try again" for an unsent message). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryIcon?: IconName;
  secondaryVariant?: ButtonVariant;
  /** Disables the actions while a request runs. */
  busy?: boolean;
}

/**
 * In-app confirm dialog (the app's Modal pattern; no system alert, which doesn't work on web).
 */
export function ConfirmSheet({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  confirmVariant = 'danger',
  confirmIcon = 'trash-outline',
  secondaryLabel,
  onSecondary,
  secondaryIcon = 'refresh',
  secondaryVariant = 'primary',
  busy = false,
}: ConfirmSheetProps) {
  const theme = useTheme();
  return (
    <Modal
      visible
      transparent
      animationType={theme.reducedMotion ? 'none' : 'fade'}
      onRequestClose={onCancel}>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
        {/* The backdrop is a sibling behind the card (a button may not contain the card's buttons). */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
        />
        <View style={styles.sheetWrap}>
          <Card padding="lg" style={{ gap: theme.spacing.sm }}>
            <Text variant="title" accessibilityRole="header">
              {title}
            </Text>
            {body ? <Text tone="muted">{body}</Text> : null}
            <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
              {secondaryLabel && onSecondary ? (
                <Button
                  title={secondaryLabel}
                  icon={secondaryIcon}
                  variant={secondaryVariant}
                  disabled={busy}
                  onPress={onSecondary}
                />
              ) : null}
              <Button
                title={confirmLabel}
                variant={confirmVariant}
                icon={confirmIcon}
                disabled={busy}
                loading={busy}
                onPress={onConfirm}
              />
              <Button title={cancelLabel} variant="ghost" onPress={onCancel} />
            </View>
          </Card>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 24 },
  sheetWrap: { width: '100%', maxWidth: 420, alignSelf: 'center' },
});
