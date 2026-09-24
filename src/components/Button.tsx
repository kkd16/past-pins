import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { theme } from '../theme';
import { AppText } from './AppText';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: 'primary' | 'quiet';
};

export function Button({
  label,
  variant = 'primary',
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ ...props.accessibilityState, disabled: !!disabled }}
      disabled={disabled}
      style={(state) => [
        styles.base,
        variant === 'primary' && styles.primary,
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <AppText
        variant="label"
        style={variant === 'primary' ? styles.primaryLabel : styles.quietLabel}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.size.touch,
    minWidth: theme.size.touch,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primary: { backgroundColor: theme.color.accent },
  primaryLabel: { color: theme.color.onAccent },
  quietLabel: { color: theme.color.textMuted },
  pressed: { opacity: theme.opacity.pressed },
  disabled: { opacity: theme.opacity.disabled },
});
