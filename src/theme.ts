import type { TextStyle } from 'react-native';

const palette = {
  forest: '#101B18',
  canopy: '#192823',
  moss: '#3B5148',
  stone: '#EDF1E8',
  sage: '#A6B5AA',
  fern: '#A8CAA0',
} as const;

export const theme = {
  color: {
    background: palette.forest,
    surface: palette.canopy,
    border: palette.moss,
    land: palette.moss,
    text: palette.stone,
    textMuted: palette.sage,
    accent: palette.fern,
    onAccent: palette.forest,
    selectedSurface: '#20382C',
  },
  typography: {
    title: {
      fontFamily: 'ui-rounded',
      fontSize: 32,
      fontWeight: '600',
      letterSpacing: -0.8,
    },
    heading: {
      fontFamily: 'ui-rounded',
      fontSize: 20,
      fontWeight: '600',
      letterSpacing: -0.3,
    },
    body: { fontSize: 17, fontWeight: '400' },
    label: { fontSize: 15, fontWeight: '600' },
    caption: { fontSize: 13, fontWeight: '400' },
  } satisfies Record<string, TextStyle>,
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  radius: { sm: 12, lg: 20, pill: 999 },
  size: { touch: 44, row: 60, check: 26, icon: 20, contentMax: 760 },
  opacity: { pressed: 0.72, disabled: 0.45 },
} as const;

export type TextVariant = keyof typeof theme.typography;
