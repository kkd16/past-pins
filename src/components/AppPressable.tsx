import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { language } from '../localization';
import { theme } from '../theme';

export type AppPressableProps = ComponentProps<typeof Pressable>;

export function AppPressable({
  disabled,
  style,
  ...props
}: AppPressableProps) {
  return (
    <Pressable
      accessibilityLanguage={language}
      accessibilityRole="button"
      {...props}
      disabled={disabled}
      style={(state) => [
        styles.touchTarget,
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  touchTarget: { minHeight: theme.size.touch, minWidth: theme.size.touch },
  pressed: { opacity: theme.opacity.pressed },
  disabled: { opacity: theme.opacity.disabled },
});
