import { StyleSheet, View } from 'react-native';

import { AppText } from '../../components/ui/AppText';
import { theme } from '../../theme';

export function ProgressSummary({
  visited,
  total,
  loading,
}: {
  visited: number;
  total: number;
  loading: boolean;
}) {
  const percent = total ? (visited / total) * 100 : 0;
  return (
    <View style={styles.container}>
      <View style={styles.labels}>
        <AppText variant="caption" tone="muted" style={styles.label}>
          <AppText variant="label">{loading ? '—' : visited}</AppText> of{' '}
          {total} countries & territories
        </AppText>
        <AppText variant="label" tone="accent" style={styles.number}>
          {loading ? '—' : `${percent.toFixed(1)}%`}
        </AppText>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Places visited"
        accessibilityValue={
          loading
            ? { text: 'Loading saved visits' }
            : { min: 0, max: total, now: visited }
        }
        style={styles.track}
      >
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
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
    height: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.pill,
  },
});
