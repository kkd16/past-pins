import { StyleSheet, Switch, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Sheet } from '../components/Sheet';
import { countryById } from '../countries/catalog';
import { VisitsFeedback } from '../countries/VisitsFeedback';
import { useVisits } from '../countries/VisitsProvider';
import { theme } from '../theme';

export function CountryDetailsScreen({
  id,
  onDone,
}: {
  id: string;
  onDone: () => void;
}) {
  const visits = useVisits();
  const country = countryById.get(id);
  return (
    <Sheet title={country?.name ?? 'Place not found'} onDone={onDone}>
      {country ? (
        <>
          <AppText tone="muted">{country.continent.name}</AppText>
          <View style={styles.visitRow}>
            <AppText style={styles.label}>Visited</AppText>
            <Switch
              accessibilityLabel={`${country.name} visited`}
              value={visits.visitedIds.has(id)}
              disabled={visits.status !== 'ready'}
              onValueChange={(visited) => visits.setVisited(id, visited)}
              trackColor={{
                true: theme.color.accent,
                false: theme.color.border,
              }}
            />
          </View>
          <VisitsFeedback {...visits} />
        </>
      ) : (
        <AppText tone="muted">This place isn’t in the catalog.</AppText>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.lg,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.sm,
    padding: theme.space.lg,
    minHeight: theme.size.row,
  },
  label: { flex: 1 },
});
