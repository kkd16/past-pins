import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '../theme';
import { AppText } from './AppText';

export function ScreenHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.text}>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="caption" tone="muted">
            {subtitle}
          </AppText>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingBottom: theme.space.lg,
  },
  text: { flex: 1, gap: theme.space.xs },
});
