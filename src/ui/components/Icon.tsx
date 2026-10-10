import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useTheme } from '@/ui/ThemeProvider';

export type IconName = ComponentProps<typeof Ionicons>['name'];

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

/** Ionicons glyph, default size follows the theme body size. */
export function Icon({ name, size, color }: IconProps) {
  const theme = useTheme();
  return (
    <Ionicons
      name={name}
      size={size ?? Math.round(theme.type.body.size * 1.35)}
      color={color ?? theme.colors.text}
    />
  );
}
