import { Text, type TextProps } from 'react-native';

import { theme, type TextVariant } from '../../theme';

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  tone?: 'default' | 'muted' | 'accent';
};

export function AppText({
  variant = 'body',
  tone = 'default',
  style,
  ...props
}: AppTextProps) {
  const color =
    tone === 'muted'
      ? theme.color.textMuted
      : tone === 'accent'
        ? theme.color.accent
        : theme.color.text;
  return (
    <Text {...props} style={[theme.typography[variant], { color }, style]} />
  );
}
