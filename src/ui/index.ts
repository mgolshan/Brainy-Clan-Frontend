/** Shared UI: theme access + base components. Import from '@/ui'. */
export { ThemeProvider, useTheme, makeStyles, resolveTheme } from '@/ui/ThemeProvider';
export type { ThemeSelection } from '@/ui/ThemeProvider';
export * from '@/ui/themes';
export { Appear } from '@/ui/components/Appear';
export { Avatar, AVATAR_EMOJI, avatarEmoji, isAvatarKey } from '@/ui/components/Avatar';
export { Badge, type BadgeTone } from '@/ui/components/Badge';
export { Button, type ButtonProps, type ButtonVariant } from '@/ui/components/Button';
export { Card, surfaceStyle, withAlpha } from '@/ui/components/Card';
export { Celebration, Confetti } from '@/ui/components/Celebration';
export {
  Chip,
  IconBubble,
  SectionHeader,
  Segmented,
  Stepper,
  ToggleRow,
  type SegmentOption,
} from '@/ui/components/Controls';
export { Hearts } from '@/ui/components/Hearts';
export { Icon, type IconName } from '@/ui/components/Icon';
export { Divider, ListRow } from '@/ui/components/ListRow';
export { PressableScale } from '@/ui/components/PressableScale';
export { ProgressBar } from '@/ui/components/ProgressBar';
export { Screen, type ScreenListParts, type ScreenProps } from '@/ui/components/Screen';
export { EmptyState, ErrorState, Loading } from '@/ui/components/States';
export { Overline, Text, fontFor, type TextProps } from '@/ui/components/Text';
export { TextField } from '@/ui/components/TextField';
