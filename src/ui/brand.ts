/**
 * Third-party brand colors. These are **mandated by the providers' branding guidelines** and
 * therefore live outside the age-adaptive themes (the only raw hex values allowed outside
 * `src/ui/themes/`). Components still take shape, size and type scale from `useTheme()`.
 *
 * - Google: https://developers.google.com/identity/branding-guidelines (light / dark buttons,
 *   Google Sans Medium, standard multicolor "G" that is never recolored).
 * - Facebook: Meta's Facebook Login button (#1877F2 fill, white "f" logo, white label).
 */
export const brandColors = {
  google: {
    light: { fill: '#FFFFFF', stroke: '#747775', text: '#1F1F1F' },
    dark: { fill: '#131314', stroke: '#8E918F', text: '#E3E3E3' },
    logo: { red: '#EA4335', blue: '#4285F4', yellow: '#FBBC05', green: '#34A853' },
  },
  facebook: { fill: '#1877F2', pressed: '#166FE5', text: '#FFFFFF', logo: '#FFFFFF' },
} as const;
