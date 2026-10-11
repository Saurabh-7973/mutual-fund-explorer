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
  /**
   * Fund-house badges: [background, letters] pairs, muted so a list of them stays calm.
   * Identity only, never meaning: always beside the fund's name.
   */
  mark: readonly (readonly [string, string])[];
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
    mark: [
      ['#DCEBE3', '#2F5D50'],
      ['#DDE7F5', '#2C4F7C'],
      ['#F4E8D3', '#7A5518'],
      ['#EBE0EE', '#5E3D6B'],
      ['#D9ECEC', '#24605F'],
      ['#F3E1DA', '#7D3F2C'],
    ],
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
    mark: [
      ['#1E3A31', '#9FD0BC'],
      ['#1F2D42', '#A7C3E8'],
      ['#3A2E1A', '#E3C48D'],
      ['#33263A', '#D3B5DE'],
      ['#183535', '#96D3D1'],
      ['#3A2620', '#E7B4A3'],
    ],
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/**
 * A boxy scale, one step per size of thing: xs for tags, sm for chips and selector thumbs,
 * md for buttons, inputs and tracks, lg for cards. pill is kept for data bars only.
 */
export const radius = { xs: 4, sm: 6, md: 10, lg: 14, pill: 999 } as const;

/**
 * Motion, in milliseconds. Movement answers a touch (a thumb sliding to the choice, a
 * section opening) and is short enough never to make anyone wait. Everything respects the
 * system's "remove animations" setting (`useReducedMotion`).
 */
export const motion = { fast: 150, base: 220, slow: 320 } as const;

/** Minimum touch target (Apple HIG 44 pt; Android recommends 48 dp, reached with hitSlop). */
export const MIN_TOUCH = 44;

/**
 * Inter, bundled in assets/fonts (SIL OFL) and loaded at startup. Android picks a weight
 * by family name, not fontWeight, so each weight is its own family.
 */
export const fonts = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;

export const typography = {
  /** A tab's large title. */
  display: { fontSize: 28, lineHeight: 34, fontFamily: fonts.bold, letterSpacing: -0.3 },
  figure: { fontSize: 32, lineHeight: 38, fontFamily: fonts.bold, letterSpacing: -0.5 },
  title: { fontSize: 20, lineHeight: 26, fontFamily: fonts.bold },
  heading: { fontSize: 16, lineHeight: 22, fontFamily: fonts.semibold },
  body: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular },
  label: { fontSize: 13, lineHeight: 18, fontFamily: fonts.medium },
  /** Row titles: a fund's name in a list. */
  labelStrong: { fontSize: 13, lineHeight: 18, fontFamily: fonts.semibold },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fonts.regular },
} as const;

/** Numbers in columns line up when every digit has the same width. */
export const tabularNumbers: TextStyle = { fontVariant: ['tabular-nums'] };
