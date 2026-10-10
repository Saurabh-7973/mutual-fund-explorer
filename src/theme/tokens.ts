import type { TextStyle } from 'react-native';

/**
 * Design tokens. Screens take colours from `useTheme()`, never hard-coded hex values,
 * so light and dark mode stay consistent. Gains and losses always carry a sign or a
 * word as well as a colour.
 */

export interface Palette {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  gain: string;
  loss: string;
  warning: string;
  warningSurface: string;
  danger: string;
  dangerSurface: string;
  info: string;
  infoSurface: string;
}

export const palettes: { light: Palette; dark: Palette } = {
  light: {
    background: '#F6F7F9',
    surface: '#FFFFFF',
    surfaceMuted: '#ECEEF2',
    border: '#DDE1E7',
    text: '#111418',
    textMuted: '#5B6472',
    primary: '#1F5FBF',
    onPrimary: '#FFFFFF',
    gain: '#12805C',
    loss: '#C4314B',
    warning: '#8A5A00',
    warningSurface: '#FFF4D6',
    danger: '#B42318',
    dangerSurface: '#FDECEA',
    info: '#1F5FBF',
    infoSurface: '#E8F0FC',
  },
  dark: {
    background: '#0E1116',
    surface: '#161B22',
    surfaceMuted: '#222A33',
    border: '#2D3640',
    text: '#E8ECF1',
    textMuted: '#9AA5B1',
    primary: '#6EA8FE',
    onPrimary: '#0E1116',
    gain: '#3FB950',
    loss: '#FF7B8A',
    warning: '#E3B341',
    warningSurface: '#3A2E10',
    danger: '#FF8A80',
    dangerSurface: '#3D1F1C',
    info: '#6EA8FE',
    infoSurface: '#172A45',
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;

/** Minimum touch target (Apple HIG 44 pt; Android recommends 48 dp, reached with hitSlop). */
export const MIN_TOUCH = 44;

export const typography = {
  figure: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  heading: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
} as const;

/** Numbers in columns line up when every digit has the same width. */
export const tabularNumbers: TextStyle = { fontVariant: ['tabular-nums'] };
