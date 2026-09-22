import type { TextStyle } from 'react-native';

export const colors = {
  canvas: '#DFF3F4',
  paper: '#FFF8E8',
  ink: '#17324D',
  inkMuted: '#536B78',
  coral: '#F36F5C',
  ocean: '#3D7EA6',
} as const;

export const spacing = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  md: 16,
} as const;

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displaySemibold: 'BricolageGrotesque_600SemiBold',
  body: 'System',
} as const;

export const typeStyles = {
  title: {
    fontFamily: fonts.display,
    fontSize: 42,
    lineHeight: 44,
    letterSpacing: -1.5,
  } satisfies TextStyle,
  body: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 25,
  } satisfies TextStyle,
} as const;
