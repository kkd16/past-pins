import { StyleSheet } from 'react-native';

import { theme } from '../theme';
import { AppPressable, type AppPressableProps } from './AppPressable';
import { AppText } from './AppText';

export type ButtonProps = Omit<AppPressableProps, 'children'> & {
  label: string;
  variant?: 'primary' | 'quiet';
};

export function Button({
  label,
  variant = 'primary',
  style,
  ...props
}: ButtonProps) {
  return (
    <AppPressable
      {...props}
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        style,
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
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  base: {
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
});
