import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
  type TextInputSelectionChangeEventData,
} from 'react-native';

import { COUNTER_FROM, MAX_BODY_LENGTH, insertAt, prepareBody } from '@/features/chat/messages';
import { Icon, PressableScale, Text, useTheme, useUiSound } from '@/ui';

/** Quick emoji row; the OS emoji keyboard does the rest. */
export const QUICK_EMOJI = ['👍', '❤️', '😂', '😮', '😢', '🎉', '👏', '🔥', '🙏', '😊', '🤔', '💪'];

interface ComposerProps {
  onSend: (text: string) => boolean;
}

/** Multiline input + send button + quick emoji row. Enter sends on web (Shift+Enter: new line). */
export function Composer({ onSend }: ComposerProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const playSound = useUiSound();
  const [text, setText] = useState('');
  const selection = useRef({ start: 0, end: 0 });
  const canSend = prepareBody(text) !== null;
  const remaining = MAX_BODY_LENGTH - text.length;

  const send = () => {
    if (!canSend) return;
    if (onSend(text)) {
      playSound('tap');
      setText('');
      selection.current = { start: 0, end: 0 };
    }
  };

  const addEmoji = (emoji: string) => {
    const next = insertAt(text, selection.current, emoji);
    setText(next.text);
    selection.current = { start: next.cursor, end: next.cursor };
  };

  const onKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (Platform.OS !== 'web') return;
    const native = e.nativeEvent as TextInputKeyPressEventData & { shiftKey?: boolean };
    if (native.key === 'Enter' && !native.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const buttonSize = Math.max(44, theme.touchTarget);
  const inputRadius =
    theme.vibe === 'kid'
      ? theme.radius.xl
      : theme.surface === 'outlined'
        ? theme.radius.md
        : theme.radius.lg;

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.emojiRow}
        accessibilityLabel={t('chat.quickEmoji')}>
        {QUICK_EMOJI.map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => addEmoji(emoji)}
            accessibilityRole="button"
            accessibilityLabel={t('chat.addEmoji', { emoji })}
            hitSlop={4}
            style={({ pressed }) => [
              styles.emoji,
              {
                borderRadius: theme.radius.pill,
                backgroundColor: pressed ? c.primarySoft : 'transparent',
              },
            ]}>
            <Text style={styles.emojiText}>{emoji}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={[styles.inputRow, { gap: theme.spacing.sm }]}>
        <View style={styles.inputWrap}>
          <TextInput
            value={text}
            onChangeText={setText}
            onSelectionChange={(e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
              selection.current = e.nativeEvent.selection;
            }}
            onKeyPress={onKeyPress}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={c.textSubtle}
            multiline
            maxLength={MAX_BODY_LENGTH}
            accessibilityLabel={t('chat.inputLabel')}
            autoCorrect
            // Plain text only: no rich content, no link handling in the input either.
            dataDetectorTypes="none"
            style={[
              styles.input,
              {
                color: c.text,
                backgroundColor: c.surface,
                borderColor: theme.surface === 'outlined' ? c.borderStrong : c.border,
                borderWidth: Math.max(1, theme.borderWidth),
                borderRadius: inputRadius,
                fontFamily: theme.fonts.body,
                fontSize: theme.type.body.size,
                minHeight: buttonSize,
                paddingHorizontal: theme.spacing.md,
              },
            ]}
          />
          {text.length >= COUNTER_FROM ? (
            <Text
              variant="caption"
              tone={remaining <= 20 ? 'danger' : 'muted'}
              align="right"
              accessibilityLiveRegion="polite">
              {t('chat.charactersLeft', { count: remaining })}
            </Text>
          ) : null}
        </View>
        <PressableScale
          onPress={send}
          disabled={!canSend}
          haptic
          accessibilityRole="button"
          accessibilityLabel={t('chat.send')}
          accessibilityState={{ disabled: !canSend }}
          style={[
            styles.send,
            {
              width: buttonSize,
              height: buttonSize,
              borderRadius: theme.surface === 'outlined' ? theme.radius.md : buttonSize / 2,
              backgroundColor: canSend ? c.primary : c.surfaceAlt,
            },
          ]}>
          <Icon name="send" size={20} color={canSend ? c.onPrimary : c.textSubtle} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emojiRow: { gap: 2, paddingHorizontal: 2 },
  emoji: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 24, lineHeight: 30 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  inputWrap: { flex: 1, gap: 2 },
  input: { maxHeight: 140, paddingTop: 10, paddingBottom: 10, textAlignVertical: 'center' },
  send: { alignItems: 'center', justifyContent: 'center' },
});
