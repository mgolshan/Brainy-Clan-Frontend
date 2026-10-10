import { useColorScheme } from 'react-native';

const palette = {
  brand: '#208AEF',
  success: '#2E9E5B',
  danger: '#D64545',
} as const;

export const colors = {
  light: {
    ...palette,
    text: '#11181C',
    textMuted: '#60646C',
    background: '#FFFFFF',
    surface: '#F0F0F3',
    border: '#D9D9DE',
  },
  dark: {
    ...palette,
    text: '#ECEDEE',
    textMuted: '#B0B4BA',
    background: '#0B0B0D',
    surface: '#212225',
    border: '#2E3135',
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ThemeColors = (typeof colors)[ColorScheme];

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
} as const;

export const fontSize = {
  body: 16,
  title: 22,
  display: 32,
} as const;

/** Current light/dark color tokens. */
export function useThemeColors(): ThemeColors {
  return colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
