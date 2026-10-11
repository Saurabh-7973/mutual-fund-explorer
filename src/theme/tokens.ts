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
  /** Lifted above surfaceMuted: the sliding thumb of a selector track. */
  raised: string;
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
  /** The watch star only. */
  star: string;
  /** A soft tint of primary: the active tab's pill and selected chips. */
  primarySoft: string;
  /**
   * Categorical chart colours, in fixed order, validated for colour-blind separation on the
   * card surface (dataviz validator, both modes). Always shown with text labels.
   */
  chart: readonly [string, string, string, string];
  /** The "Other" slice: neutral, never a fifth hue. */
  chartOther: string;
}

export const palettes: { light: Palette; dark: Palette } = {
  // "Patient money": a deep banyan green and ink on cool paper. Gains and losses are
  // muted, because long-term money shouldn't flash like a trading screen.
  light: {
    background: '#F2F5F1',
    surface: '#FFFFFF',
    surfaceMuted: '#E6EBE5',
    raised: '#FFFFFF',
    border: '#D5DCD3',
    text: '#15211C',
    textMuted: '#5A6A62',
    primary: '#2F5D50',
    onPrimary: '#FFFFFF',
    gain: '#1E7650',
    loss: '#B0473D',
    warning: '#85580A',
    warningSurface: '#FAF0D7',
    danger: '#B2362D',
    dangerSurface: '#FBE8E5',
    info: '#2C5D7C',
    infoSurface: '#E4EEF3',
    star: '#C08A1E',
    primarySoft: '#DCE9E3',
    chart: ['#2A78D6', '#EB6834', '#1BAF7A', '#EDA100'],
    chartOther: '#A3ADA7',
  },
  dark: {
    background: '#0D1311',
    surface: '#151D1A',
    surfaceMuted: '#1F2925',
    raised: '#2E3A35',
    border: '#2A3530',
    text: '#E5ECE8',
    textMuted: '#93A39A',
    primary: '#83BCA7',
    onPrimary: '#0D1311',
    gain: '#5DBE8C',
    loss: '#EE8A7E',
    warning: '#E0B44C',
    warningSurface: '#32290F',
    danger: '#F08A80',
    dangerSurface: '#3A1E1B',
    info: '#8CB8D4',
    infoSurface: '#16283A',
    star: '#E3B04B',
    primarySoft: '#1E3A31',
    chart: ['#3987E5', '#D95926', '#199E70', '#C98500'],
    chartOther: '#5B6862',
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;

/**
 * Motion, in milliseconds. Movement answers a touch (a thumb sliding to the choice, a
 * section opening) and is short enough never to make anyone wait. Everything respects the
 * system's "remove animations" setting (`useReducedMotion`).
 */
export const motion = { fast: 150, base: 220, slow: 320 } as const;

/** Minimum touch target (Apple HIG 44 pt; Android recommends 48 dp, reached with hitSlop). */
export const MIN_TOUCH = 44;

export const typography = {
  /** A tab's large title. */
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3 },
  figure: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  heading: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  /** Row titles: a fund's name in a list. */
  labelStrong: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
} as const;

/** Numbers in columns line up when every digit has the same width. */
export const tabularNumbers: TextStyle = { fontVariant: ['tabular-nums'] };
