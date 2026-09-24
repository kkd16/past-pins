import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { theme } from '../theme';
import { AppText } from './AppText';

export function ScreenHeader({
  title,
  subtitle,
  compact = false,
  children,
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
  children?: ReactNode;
}) {
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale > theme.accessibility.largeTextScale;
  return (
    <View
      style={[
        styles.header,
        compact && styles.compact,
        stacked && styles.stacked,
      ]}
    >
      <View style={[styles.text, stacked && styles.stackedText]}>
        <AppText
          variant={compact ? 'heading' : 'title'}
          accessibilityRole="header"
        >
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
  compact: { paddingBottom: 0 },
  stacked: { flexDirection: 'column', alignItems: 'flex-end' },
  stackedText: { flex: 0, alignSelf: 'stretch' },
  text: { flex: 1, gap: theme.space.xs },
});
