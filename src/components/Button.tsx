import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { language } from '../localization';
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
      accessibilityLanguage={language}
      {...props}
      accessibilityRole="button"
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
        style={[
          styles.label,
          variant === 'primary' ? styles.primaryLabel : styles.quietLabel,
        ]}
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
    maxWidth: '100%',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: { textAlign: 'center' },
  primary: { backgroundColor: theme.color.accent },
  primaryLabel: { color: theme.color.onAccent },
  quietLabel: { color: theme.color.accent },
  pressed: { opacity: theme.opacity.pressed },
  disabled: { opacity: theme.opacity.disabled },
});
