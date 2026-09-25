import { Text, type TextProps } from 'react-native';

import { language } from '../localization';
import { theme, type TextVariant } from '../theme';

type AppTextProps = TextProps & {
  variant?: TextVariant;
  tone?: 'default' | 'muted' | 'accent' | 'visited';
};

export function AppText({
  variant = 'body',
  tone = 'default',
  style,
  ...props
}: AppTextProps) {
  const color = {
    default: theme.color.text,
    muted: theme.color.textMuted,
    accent: theme.color.accent,
    visited: theme.color.visitedEmphasis,
  }[tone];
  return (
    <Text
      accessibilityLanguage={language}
      {...props}
      style={[theme.typography[variant], { color }, style]}
    />
  );
}
