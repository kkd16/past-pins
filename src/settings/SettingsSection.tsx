import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppPressable } from '../components/AppPressable';
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
  disclosure = false,
  disabled = false,
  busy = false,
}: {
  title: string;
  value?: string;
  onPress: () => void;
  destructive?: boolean;
  disclosure?: boolean;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <AppPressable
      disabled={disabled || busy}
      accessibilityState={busy ? { busy: true } : undefined}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.text}>
        <AppText style={destructive && styles.destructive}>{title}</AppText>
        {value && (
          <AppText variant="caption" tone="muted">
            {value}
          </AppText>
        )}
      </View>
      {busy ? (
        <ActivityIndicator
          color={theme.color.accent}
          accessibilityElementsHidden
        />
      ) : (
        disclosure && <Icon name="chevronRight" />
      )}
    </AppPressable>
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
});
