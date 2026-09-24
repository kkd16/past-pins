import { View, type ViewProps } from 'react-native';

import { theme } from '../theme';

export function Surface({
  variant = 'panel',
  style,
  ...props
}: ViewProps & { variant?: keyof typeof theme.surface }) {
  return <View {...props} style={[theme.surface[variant], style]} />;
}
