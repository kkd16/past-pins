import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { language } from '../localization';
import { theme } from '../theme';
import { Icon, type IconProps } from './Icon';

export type IconButtonProps = Omit<
  PressableProps,
  'children' | 'accessibilityLabel'
> &
  IconProps & { accessibilityLabel: string };

export function IconButton({
  name,
  size,
  color,
  disabled,
  style,
  ...props
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityLanguage={language}
      {...props}
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.base,
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.pill,
    minHeight: theme.size.touch,
    minWidth: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: theme.opacity.pressed },
  disabled: { opacity: theme.opacity.disabled },
});
