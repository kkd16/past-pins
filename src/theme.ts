import type { TextStyle, ViewStyle } from 'react-native';

const palette = {
  forest: '#101B18',
  canopy: '#192823',
  moss: '#3B5148',
  stone: '#EDF1E8',
  sage: '#A6B5AA',
  fern: '#A8CAA0',
} as const;

const color = {
  background: palette.forest,
  surface: palette.canopy,
  border: palette.moss,
  controlBorder: '#6C8778',
  text: palette.stone,
  textMuted: palette.sage,
  accent: palette.fern,
  onAccent: palette.forest,
  visited: palette.fern,
  onVisited: palette.forest,
  visitedEmphasis: palette.fern,
  visitedSurface: '#20382C',
  selectedSurface: '#20382C',
  wishlist: '#E5C783',
  lived: '#8ED5C0',
  destructive: '#F2A79B',
} as const;

const radius = { sm: 12, lg: 20, pill: 999 } as const;
const stroke = { subtle: 1, control: 1.5 } as const;

export const theme = {
  color,
  appearance: { colorScheme: 'dark', statusBarStyle: 'light' },
  surface: {
    panel: {
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      borderCurve: 'continuous',
    },
    floating: {
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      shadowColor: palette.forest,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
    },
  } satisfies Record<string, ViewStyle>,
  globe: {
    ocean: palette.canopy,
    land: '#587568',
    visited: palette.fern,
    wishlist: color.wishlist,
    lived: color.lived,
    selected: palette.stone,
    border: palette.forest,
    lightDirection: [-0.6, 0.65, 1] as [number, number, number],
    ambient: 0.8,
    diffuse: 0.2,
    markerSize: 6,
  },
  typography: {
    title: {
      fontFamily: 'ui-rounded',
      fontSize: 34,
      fontWeight: '700',
      letterSpacing: -0.9,
    },
    heading: {
      fontFamily: 'ui-rounded',
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    display: {
      fontFamily: 'ui-rounded',
      fontSize: 64,
      fontWeight: '700',
      letterSpacing: -2,
      fontVariant: ['tabular-nums'],
    },
    number: {
      fontFamily: 'ui-rounded',
      fontSize: 28,
      fontWeight: '600',
      letterSpacing: -0.5,
      fontVariant: ['tabular-nums'],
    },
    body: { fontSize: 17, fontWeight: '400' },
    label: { fontSize: 15, fontWeight: '600' },
    caption: { fontSize: 13, fontWeight: '400' },
  } satisfies Record<string, TextStyle>,
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  radius,
  stroke,
  size: {
    touch: 44,
    row: 64,
    check: 28,
    icon: 20,
    iconSmall: 18,
    progress: 6,
    contentMax: 760,
  },
  motion: {
    cameraDuration: 420,
    enter: 220,
    pressRelease: 180,
    progress: 280,
    lift: 8,
    checkScale: 1.16,
    checkExpand: 90,
    checkSettle: 140,
  },
  accessibility: { largeTextScale: 1.3 },
  opacity: { pressed: 0.72, disabled: 0.45 },
} as const;

export type TextVariant = keyof typeof theme.typography;
