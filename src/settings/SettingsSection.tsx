import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Icon } from '../components/Icon';
import { Surface } from '../components/Surface';
import { theme } from '../theme';

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <AppText variant="label" tone="muted" accessibilityRole="header">
        {title}
      </AppText>
      <Surface style={styles.panel}>{children}</Surface>
      {description && (
        <AppText variant="caption" tone="muted">
          {description}
        </AppText>
      )}
    </View>
  );
}

export function SettingsRow({
  title,
  value,
  onPress,
  destructive,
  disabled = false,
}: {
  title: string;
  value?: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.text}>
        <AppText style={destructive && styles.destructive}>{title}</AppText>
        {value && (
          <AppText variant="caption" tone="muted">
            {value}
          </AppText>
        )}
      </View>
      <Icon
        name="chevronRight"
        color={destructive ? theme.color.destructive : theme.color.textMuted}
      />
    </Pressable>
  );
}

export function SettingsToggle({
  title,
  value,
  onChange,
  disabled,
}: {
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <AppText style={styles.text}>{title}</AppText>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: theme.color.border, true: theme.color.accent }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: theme.space.sm },
  panel: { padding: theme.space.xs },
  row: {
    minHeight: theme.size.row,
    padding: theme.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  text: { flex: 1, gap: theme.space.xs },
  destructive: { color: theme.color.destructive },
  pressed: { opacity: theme.opacity.pressed },
  disabled: { opacity: theme.opacity.disabled },
});
