import { useColorScheme } from 'react-native';

import { palettes, radius, spacing, typography, type Palette } from './tokens';

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

// Two constant objects, so `useTheme()` returns a stable reference that is safe in memo dependencies.
const THEMES: Record<ThemeMode, Theme> = {
  light: { mode: 'light', colors: palettes.light, spacing, radius, typography },
  dark: { mode: 'dark', colors: palettes.dark, spacing, radius, typography },
};

/** Follows the system setting ("automatic" in app.json); anything but dark is light. */
export function useTheme(): Theme {
  return THEMES[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
