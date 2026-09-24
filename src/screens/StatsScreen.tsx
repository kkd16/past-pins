import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { MapAttribution } from '../countries/MapAttribution';
import { ProgressSummary } from '../countries/ProgressSummary';
import { getVisitStatistics } from '../countries/statistics';
import { VisitsFeedback } from '../countries/VisitsFeedback';
import { useVisits } from '../countries/VisitsProvider';
import { theme } from '../theme';

function Statistic({ value, label }: { value: string; label: string }) {
  return (
    <View
      style={styles.statistic}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <AppText variant="title" style={styles.number}>
        {value}
      </AppText>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}

export function StatsScreen() {
  const visits = useVisits();
  const stats = useMemo(
    () => getVisitStatistics(visits.visitedIds),
    [visits.visitedIds],
  );
  const loading = visits.status !== 'ready';
  return (
    <Screen>
      <ScreenHeader
        title="Your world."
        subtitle="Every place is part of your story."
      />
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
      >
        <VisitsFeedback {...visits} />
        <View style={styles.totals}>
          <Statistic
            value={loading ? '—' : String(stats.visited)}
            label="Places visited"
          />
          <Statistic
            value={loading ? '—' : String(stats.remaining)}
            label="Places remaining"
          />
          <Statistic
            value={loading ? '—' : `${stats.percent.toFixed(1)}%`}
            label="Of all places"
          />
        </View>
        <AppText variant="heading" accessibilityRole="header">
          By continent
        </AppText>
        <View style={styles.continents}>
          {stats.byContinent.map((continent) => (
            <ProgressSummary
              key={continent.id}
              label={continent.name}
              visited={continent.visited}
              total={continent.total}
              loading={loading}
            />
          ))}
        </View>
        <MapAttribution />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.space.xl, gap: theme.space.lg },
  totals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    paddingBottom: theme.space.lg,
  },
  statistic: {
    flexGrow: 1,
    flexBasis: 130,
    padding: theme.space.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surface,
    gap: theme.space.sm,
  },
  number: { color: theme.color.accent, fontVariant: ['tabular-nums'] },
  continents: {
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surface,
  },
});
