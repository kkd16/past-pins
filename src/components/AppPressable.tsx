import type { ComponentProps } from 'react';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { language } from '../localization';
import { theme } from '../theme';

export type AppPressableProps = Omit<ComponentProps<typeof Pressable>, 'style'> & {
  style?: StyleProp<ViewStyle>;
};

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
      style={({ pressed }) => [
        styles.touchTarget,
        style,
        disabled ? styles.disabled : pressed && styles.pressed,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  touchTarget: { minHeight: theme.size.touch, minWidth: theme.size.touch },
  disabled: { opacity: theme.opacity.disabled },
  pressed: { opacity: theme.opacity.pressed },
});
