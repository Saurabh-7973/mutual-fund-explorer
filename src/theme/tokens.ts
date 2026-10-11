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
  /** Shadow colour for the few lifted things (a selector thumb), used at 8% opacity. */
  shadow: string;
  /** Input outlines and the tab bar's top edge; cards have no border. */
  border: string;
  /** Inset separators inside a card, the only lines on a page. */
  hairline: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  gain: string;
  /** Tint behind a gain chip. */
  gainSurface: string;
  loss: string;
  /** Tint behind a loss chip. */
  lossSurface: string;
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
    background: '#F3F4F0',
    surface: '#FFFFFF',
    surfaceMuted: '#E9ECE7',
    raised: '#FFFFFF',
    shadow: '#111B17',
    border: '#E3E7E2',
    hairline: '#EEF1ED',
    text: '#111B17',
    textMuted: '#59665F',
    primary: '#1E4D40',
    onPrimary: '#FFFFFF',
    gain: '#127A4C',
    gainSurface: '#E3F2EA',
    loss: '#B53A2E',
    lossSurface: '#FBEAE7',
    warning: '#7A4F09',
    warningSurface: '#F8EDD3',
    danger: '#B2362D',
    dangerSurface: '#FBE8E5',
    info: '#2C5D7C',
    infoSurface: '#E4EEF3',
    star: '#C68A12',
    primarySoft: '#E2EDE7',
    chart: ['#3D5A98', '#D29A2E', '#2AA198', '#B23A6E'],
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
    background: '#0E1412',
    surface: '#18201C',
    surfaceMuted: '#222B27',
    raised: '#2E3833',
    shadow: '#000000',
    border: '#2A332F',
    hairline: '#232C28',
    text: '#E8EEEA',
    textMuted: '#9CAAA2',
    primary: '#8CC3AE',
    onPrimary: '#0E1412',
    gain: '#63C793',
    gainSurface: '#183326',
    loss: '#F08E81',
    lossSurface: '#3A201C',
    warning: '#E6BE5E',
    warningSurface: '#33290F',
    danger: '#F08A80',
    dangerSurface: '#3A1E1B',
    info: '#8CB8D4',
    infoSurface: '#16283A',
    star: '#E3B04B',
    primarySoft: '#1F3A31',
    chart: ['#5F7FCC', '#BB8522', '#2BAA9C', '#A93C68'],
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
 * One step per size of thing: xs for small tags, sm for selector thumbs, md for buttons,
 * inputs and tracks, control for range pills, field for the search field, lg for cards.
 * pill for chips that carry a figure (change, stale) and data bars.
 */
export const radius = { xs: 4, sm: 8, md: 10, control: 12, field: 16, lg: 20, pill: 999 } as const;

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
  display: { fontSize: 30, lineHeight: 36, fontFamily: fonts.bold, letterSpacing: -0.6 },
  /** The one rupee amount a screen is about (MoneyHero sets the ₹ and paise smaller). */
  money: { fontSize: 42, lineHeight: 48, fontFamily: fonts.bold, letterSpacing: -1.4 },
  /** A fund's headline return. */
  hero: { fontSize: 46, lineHeight: 52, fontFamily: fonts.bold, letterSpacing: -1.6 },
  figure: { fontSize: 32, lineHeight: 38, fontFamily: fonts.bold, letterSpacing: -0.5 },
  title: { fontSize: 22, lineHeight: 28, fontFamily: fonts.bold },
  heading: { fontSize: 17, lineHeight: 22, fontFamily: fonts.semibold },
  /** A fund's name in a list row. */
  rowTitle: { fontSize: 15, lineHeight: 20, fontFamily: fonts.semibold },
  body: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular },
  label: { fontSize: 13, lineHeight: 18, fontFamily: fonts.medium },
  /** Row titles: a fund's name in a list. */
  labelStrong: { fontSize: 13, lineHeight: 18, fontFamily: fonts.semibold },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fonts.regular },
} as const;

/** Numbers in columns line up when every digit has the same width. */
export const tabularNumbers: TextStyle = { fontVariant: ['tabular-nums'] };
