import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { language } from '../localization';
import { theme } from '../theme';
import { AppText } from './AppText';
import { Surface } from './Surface';

export function ChoiceSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Surface
      style={styles.section}
      accessibilityRole="radiogroup"
      accessibilityLabel={title}
      accessibilityLanguage={language}
    >
      <AppText
        variant="label"
        tone="muted"
        accessibilityRole="header"
        style={styles.label}
      >
        {title}
      </AppText>
      {children}
      {description && (
        <AppText variant="caption" tone="muted" style={styles.label}>
          {description}
        </AppText>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  section: { padding: theme.space.sm, gap: theme.space.xs },
  label: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
});
