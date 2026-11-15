/**
 * BEATLINK design tokens — "Session de nuit".
 * A booth in the dark: the only light is the signal. The accent (Signal) is
 * reserved for what plays, what's alive, what's new, and the primary action.
 * Documented in docs/03-design-system.md.
 */
import type { TextStyle } from 'react-native';

export const colors = {
  /** App background: charcoal with a violet undertone (the booth). */
  booth: '#0E0D12',
  /** Base surface: cards, bars. */
  desk: '#16151B',
  /** Raised surface: sheets, inputs, pressed rows. */
  rack: '#1F1D26',
  /** Borders, unplayed waveform, inactive controls. */
  fader: '#2E2B38',
  faderHigh: '#423D50',
  /** Primary text, played waveform. */
  paper: '#EEEBF5',
  /** Secondary text. */
  mist: '#9C98AB',
  /** Tertiary text, placeholders. */
  dim: '#6D6979',
  /** The single accent. */
  signal: '#A99BFF',
  signalPressed: '#8F7CFF',
  /** Text and icons placed on Signal. */
  signalInk: '#15112A',
  signalSoft: 'rgba(169, 155, 255, 0.14)',
  signalLine: 'rgba(169, 155, 255, 0.38)',
  /** Destructive and errors (the clip light on a console). */
  clip: '#FF6B73',
  clipSoft: 'rgba(255, 107, 115, 0.12)',
  hairline: 'rgba(238, 235, 245, 0.08)',
  hairlineStrong: 'rgba(238, 235, 245, 0.14)',
  scrim: 'rgba(14, 13, 18, 0.78)',
  overlay: 'rgba(6, 5, 9, 0.6)',
} as const;

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Radius follows hierarchy: the bigger the object, the softer the corner. */
export const radius = {
  thumb: 10,
  input: 14,
  tile: 20,
  card: 28,
  sheet: 32,
  pill: 999,
} as const;

export const fonts = {
  display: 'Syne_800ExtraBold',
  displayBold: 'Syne_700Bold',
  ui: 'InstrumentSans_400Regular',
  uiMedium: 'InstrumentSans_500Medium',
  uiSemi: 'InstrumentSans_600SemiBold',
  uiBold: 'InstrumentSans_700Bold',
} as const;

/** Type scale: 11 · 13 · 14 · 16 · 18 · 24 · 34 (+ 44 for the hero). */
export const type = {
  hero: { fontFamily: fonts.display, fontSize: 44, lineHeight: 46, letterSpacing: -1 },
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.6 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 29, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 23, letterSpacing: -0.1 },
  body: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.uiSemi, fontSize: 16, lineHeight: 23 },
  label: { fontFamily: fonts.uiMedium, fontSize: 14, lineHeight: 19 },
  labelStrong: { fontFamily: fonts.uiSemi, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: fonts.uiMedium, fontSize: 11, lineHeight: 14, letterSpacing: 0.2 },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

export const motion = {
  fast: 160,
  base: 220,
  slow: 320,
  /** Discover card follow-through. */
  cardSpring: { damping: 20, stiffness: 190, mass: 0.9 },
  /** Press feedback. */
  pressSpring: { damping: 18, stiffness: 420, mass: 0.6 },
} as const;

export const layout = {
  gutter: 20,
  tabBarHeight: 64,
  miniPlayerHeight: 60,
  maxContentWidth: 560,
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
} as const;
