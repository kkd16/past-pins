import { StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { theme } from '../theme';

export function ProgressSummary({
  visited,
  total,
  loading,
  label = 'Places visited',
}: {
  visited: number;
  total: number;
  loading: boolean;
  label?: string;
}) {
  const percent = total ? (visited / total) * 100 : 0;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={
        loading
          ? { text: 'Loading saved visits' }
          : {
              min: 0,
              max: total,
              now: visited,
              text: `${visited} of ${total} places, ${percent.toFixed(1)} percent`,
            }
      }
      style={styles.container}
    >
      <View style={styles.labels}>
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>
        <AppText variant="label" tone="visited" style={styles.number}>
          {loading ? '—' : `${percent.toFixed(1)}%`}
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      <AppText variant="caption" tone="muted">
        {loading ? '—' : visited} of {total} places
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.space.sm,
    paddingHorizontal: theme.space.xs,
    paddingVertical: theme.space.lg,
  },
  labels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  label: { flex: 1 },
  number: { fontVariant: ['tabular-nums'] },
  track: {
    height: theme.size.progress,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: theme.color.visitedEmphasis,
    borderRadius: theme.radius.pill,
  },
});
