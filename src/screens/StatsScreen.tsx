import { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppText } from '../components/AppText';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { Surface } from '../components/Surface';
import { MapAttribution } from '../countries/MapAttribution';
import { ProgressSummary } from '../countries/ProgressSummary';
import { getVisitStatistics } from '../countries/statistics';
import { VisitsFeedback } from '../countries/VisitsFeedback';
import { useVisits } from '../countries/VisitsProvider';
import { theme } from '../theme';

function Statistic({
  value,
  label,
  largeText,
}: {
  value: string;
  label: string;
  largeText: boolean;
}) {
  return (
    <Surface
      style={[styles.statistic, largeText && styles.fullWidth]}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <AppText variant={largeText ? 'heading' : 'number'} tone="accent">
        {value}
      </AppText>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </Surface>
  );
}

export function StatsScreen() {
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale > theme.accessibility.largeTextScale;
  const visits = useVisits();
  const stats = useMemo(
    () => getVisitStatistics(visits.visitedIds),
    [visits.visitedIds],
  );
  const loading = visits.status !== 'ready';
  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
      >
        <ScreenHeader
          title="Your world"
          subtitle="A little further with every visit."
        />
        <VisitsFeedback {...visits} />
        <Surface
          style={styles.journey}
          accessible
          accessibilityLabel={
            loading
              ? 'Loading places visited'
              : `${stats.visited} places visited`
          }
        >
          <AppText variant="label">Places visited</AppText>
          <AppText variant={largeText ? 'title' : 'display'} tone="visited">
            {loading ? '—' : String(stats.visited)}
          </AppText>
          <AppText tone="muted">
            {!loading && stats.visited === 0
              ? 'Your next adventure starts anywhere.'
              : 'Every place, part of your story.'}
          </AppText>
        </Surface>
        <View style={styles.totals}>
          <Statistic
            value={loading ? '—' : String(stats.remaining)}
            label="Places remaining"
            largeText={largeText}
          />
          <Statistic
            value={loading ? '—' : `${stats.percent.toFixed(1)}%`}
            label="World explored"
            largeText={largeText}
          />
        </View>
        <AppText variant="heading" accessibilityRole="header">
          By continent
        </AppText>
        <Surface style={styles.continents}>
          {stats.byContinent.map((continent) => (
            <ProgressSummary
              key={continent.id}
              label={continent.name}
              visited={continent.visited}
              total={continent.total}
              loading={loading}
            />
          ))}
        </Surface>
        <MapAttribution />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.space.xl, gap: theme.space.lg },
  journey: { padding: theme.space.xl, gap: theme.space.sm },
  totals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  statistic: {
    flexGrow: 1,
    flexBasis: 150,
    padding: theme.space.lg,
    gap: theme.space.sm,
  },
  fullWidth: { flexBasis: '100%' },
  continents: {
    paddingHorizontal: theme.space.lg,
  },
});
