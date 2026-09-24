import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Screen } from '../components/Screen';
import { theme } from '../theme';

export function InfoPage({ children }: { children: ReactNode }) {
  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
    </Screen>
  );
}

export function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      <AppText tone="muted" selectable>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: theme.space.lg,
    gap: theme.space.xl,
    paddingBottom: theme.space.xl,
  },
  section: { gap: theme.space.sm },
});
