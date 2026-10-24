import { memo } from 'react';
import { Platform, StyleSheet, type TextStyle } from 'react-native';

import { Text } from '@/ui';

interface MessageTextProps {
  body: string | null | undefined;
  color: string;
}

/**
 * The ONLY place a chat message body is rendered. Safety rules (non-negotiable, see PLAN.md
 * "Family chat"): the body is a single plain string child of React Native `<Text>` — never HTML
 * (no WebView, no `dangerouslySetInnerHTML`), never Markdown, no link / phone / address
 * detection, and nothing in it is ever opened. `<script>`, `<img onerror=…>` or `javascript:`
 * show as the literal characters typed. Long unbroken strings wrap instead of breaking the
 * layout.
 */
export const MessageText = memo(function MessageText({ body, color }: MessageTextProps) {
  // Anything but a string (a malformed payload) renders as nothing rather than crashing.
  const text = typeof body === 'string' ? body : '';
  return (
    <Text
      color={color}
      selectable
      // Android: no automatic links. iOS `<Text>` never detects data; web renders text nodes.
      dataDetectorType="none"
      style={[styles.text, Platform.OS === 'web' ? webWrap : null]}>
      {text}
    </Text>
  );
});

/** Web: break long words / URLs anywhere instead of overflowing the bubble. */
const webWrap = { wordBreak: 'break-word', overflowWrap: 'anywhere' } as unknown as TextStyle;

const styles = StyleSheet.create({
  text: { flexShrink: 1 },
});
