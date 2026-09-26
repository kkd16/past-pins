import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Screen } from '../components/Screen';
import { formatNumber, t } from '../localization';
import { theme } from '../theme';

export function OnboardingPage({
  step,
  title,
  description,
  children,
  actions,
}: {
  step: 1 | 2;
  title: string;
  description: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
      >
        <View style={styles.progress}>
          <AppText variant="caption" tone="muted">
            {t('onboarding.step', { current: formatNumber(step), total: formatNumber(2) })}
          </AppText>
          <View style={styles.track} accessibilityElementsHidden>
            <View style={[styles.segment, styles.filled]} />
            <View style={[styles.segment, step === 2 && styles.filled]} />
          </View>
        </View>
        <View style={styles.body}>
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

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: theme.space.xl, paddingVertical: theme.space.lg },
  progress: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  track: { flexDirection: 'row', gap: theme.space.xs },
  segment: {
    width: 28,
    height: theme.size.progress,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.border,
  },
  filled: { backgroundColor: theme.color.accent },
  body: { flexGrow: 1, justifyContent: 'center', gap: theme.space.xl },
  introduction: { gap: theme.space.sm },
  details: { gap: theme.space.lg },
  actions: { gap: theme.space.sm },
});
