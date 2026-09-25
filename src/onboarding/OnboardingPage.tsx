import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Screen } from '../components/Screen';
import { theme } from '../theme';

export function OnboardingPage({
  title,
  description,
  artwork,
  children,
  actions,
}: {
  title: string;
  description: string;
  artwork?: ReactNode;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
      >
        <View style={styles.body}>
          {artwork}
          <View style={styles.introduction}>
            <AppText variant="title" accessibilityRole="header">{title}</AppText>
            <AppText tone="muted">{description}</AppText>
          </View>
          <View style={styles.details}>{children}</View>
        </View>
        <View style={styles.actions}>{actions}</View>
      </ScrollView>
    </Screen>
  );
}

export function OnboardingDetail({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.detail}>
      <AppText variant="label">{title}</AppText>
      <AppText tone="muted">{description}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: theme.space.xl, paddingVertical: theme.space.xl },
  body: { flexGrow: 1, justifyContent: 'center', gap: theme.space.xl },
  introduction: { gap: theme.space.md },
  details: { gap: theme.space.lg },
  detail: { gap: theme.space.xs },
  actions: { gap: theme.space.sm },
});
