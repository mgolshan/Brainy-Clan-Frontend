import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { Family } from '@/api/types';
import { usePolicy } from '@/features/auth/hooks';
import {
  chatFilterOn,
  chatModeOptions,
  chatModesAllowed,
  isClassroom,
  normalizeChatMode,
  type ChatModeOption,
} from '@/features/chat/modes';
import { useUpdateFamily } from '@/features/family/hooks';
import { errorMessage } from '@/lib/errorMessage';
import { Card, Icon, PressableScale, SectionHeader, Text, ToggleRow, useTheme } from '@/ui';

/**
 * Admin, family settings: "Chat safety" (B12 step 2). The profanity filter switch (every plan,
 * on by default) and, only when `policy.chat.modes_allowed` (Classroom), the chat mode picker.
 * Saved at once with `PATCH /family`; the pending value shows while the request runs.
 */
export function ChatSafetySettings({ family }: { family: Family }) {
  const { t } = useTranslation();
  const policy = usePolicy();
  const update = useUpdateFamily();
  const pending = update.isPending ? update.variables : undefined;
  const filterOn = pending?.chat_filter ?? chatFilterOn(family);
  const mode = normalizeChatMode(pending?.chat_mode ?? family.chat_mode);
  const showModes = chatModesAllowed(policy);
  const classroom = isClassroom(policy?.tier ?? family.tier);

  return (
    <>
      <SectionHeader title={t('family.chatSafety.title')} />
      <Card padding="sm">
        <ToggleRow
          icon="shield-checkmark-outline"
          label={t('family.chatSafety.filterLabel')}
          description={
            filterOn ? t('family.chatSafety.filterOnHint') : t('family.chatSafety.filterOffHint')
          }
          value={filterOn}
          disabled={update.isPending}
          onValueChange={(on) => update.mutate({ chat_filter: on })}
        />
        {showModes ? (
          <View style={styles.modes}>
            <Text variant="label" weight="bold" tone="muted" accessibilityRole="header">
              {t('family.chatSafety.modeTitle')}
            </Text>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={t('family.chatSafety.modeLabel')}
              style={styles.modes}>
              {chatModeOptions(classroom).map((option) => (
                <ModeCard
                  key={option.mode}
                  option={option}
                  selected={option.mode === mode}
                  disabled={update.isPending}
                  onPress={() => {
                    if (option.mode !== mode) update.mutate({ chat_mode: option.mode });
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}
        {update.isError ? (
          <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
            {errorMessage(update.error, t)}
          </Text>
        ) : null}
      </Card>
    </>
  );
}

function ModeCard({
  option,
  selected,
  disabled,
  onPress,
}: {
  option: ChatModeOption;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const title = t(option.titleKey);
  const body = t(option.bodyKey);
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic
      accessibilityRole="radio"
      accessibilityLabel={`${title}, ${body}`}
      accessibilityState={{ checked: selected, disabled }}
      style={[
        styles.card,
        {
          minHeight: theme.touchTarget,
          gap: theme.spacing.sm,
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          borderColor: selected ? c.primary : c.border,
          borderWidth: selected ? 2 : Math.max(1, theme.borderWidth),
          backgroundColor: selected ? c.primarySoft : c.surface,
        },
      ]}>
      <Icon name={option.icon} size={22} color={selected ? c.primary : c.textMuted} />
      <View style={styles.flex}>
        <Text weight="bold">{title}</Text>
        <Text variant="caption" tone="muted">
          {body}
        </Text>
      </View>
      <Icon
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? c.primary : c.textSubtle}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  modes: { gap: 8, marginTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
