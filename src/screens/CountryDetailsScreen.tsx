import { StyleSheet, Switch, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Sheet } from '../components/Sheet';
import { Surface } from '../components/Surface';
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
    <Sheet
      title={country?.name ?? 'Place not found'}
      subtitle={country?.continent.name}
      onDone={onDone}
    >
      {country ? (
        <>
          <Surface style={styles.visitRow}>
            <View style={styles.label}>
              <AppText variant="heading">Visited</AppText>
              <AppText variant="caption" tone="muted">
                Have you been here?
              </AppText>
            </View>
            <Switch
              accessibilityLabel={`${country.name} visited`}
              value={visits.visitedIds.has(id)}
              disabled={visits.status !== 'ready'}
              onValueChange={(visited) => visits.setVisited(id, visited)}
              trackColor={{
                true: theme.color.visitedEmphasis,
                false: theme.color.controlBorder,
              }}
            />
          </Surface>
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
    padding: theme.space.xl,
    minHeight: theme.size.row,
  },
  label: { flex: 1, gap: theme.space.xs },
});
