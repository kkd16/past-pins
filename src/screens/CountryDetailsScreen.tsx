import { StyleSheet, Switch, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { ChoiceRow } from '../components/ChoiceRow';
import { DataFeedback } from '../components/DataFeedback';
import { Sheet } from '../components/Sheet';
import { Surface } from '../components/Surface';
import { UndoNotice } from '../components/UndoNotice';
import { countryById } from '../countries/catalog';
import { statusOptions } from '../countries/status';
import { useAppData } from '../data/AppDataProvider';
import { getPlaceStatus } from '../data/model';
import { theme } from '../theme';

export function CountryDetailsScreen({
  id,
  onDone,
  onShowMap,
}: {
  id: string;
  onDone: () => void;
  onShowMap: (id: string) => void;
}) {
  const app = useAppData();
  const country = countryById.get(id);
  const disabled = app.status !== 'ready' || app.busy;
  const facts = country
    ? [
        { label: 'Capital', value: country.capital },
        { label: 'Languages', value: country.languages.join(', ') },
        { label: 'Currencies', value: country.currencies.join(', ') },
      ].filter(({ value }) => value)
    : [];
  return (
    <Sheet
      title={country?.name ?? 'Place not found'}
      subtitle={country?.continent.name}
      onDone={onDone}
    >
      {country ? (
        <>
          <Surface
            style={styles.section}
            accessibilityRole="radiogroup"
            accessibilityLabel="Your connection"
          >
            <AppText
              variant="label"
              tone="muted"
              accessibilityRole="header"
              style={styles.sectionLabel}
            >
              Your connection
            </AppText>
            {statusOptions.map(({ value, label }) => (
              <ChoiceRow
                key={value}
                label={label}
                selected={getPlaceStatus(app.data, id) === value}
                disabled={disabled}
                onPress={() => {
                  void app.setStatus([id], value, { preserveLived: false });
                }}
              />
            ))}
            <AppText variant="caption" tone="muted" style={styles.sectionLabel}>
              Lived places also count as visited.
            </AppText>
          </Surface>
          <Surface style={styles.home}>
            <View style={styles.label}>
              <AppText variant="label">Current home</AppText>
              <AppText variant="caption" tone="muted">
                You can have one current home. Previous homes stay marked Lived.
              </AppText>
            </View>
            <Switch
              accessibilityLabel={country.name + ' is my current home'}
              value={app.data.homeCountryId === id}
              disabled={disabled}
              onValueChange={(home) => app.setHome(home ? id : null)}
              trackColor={{
                true: theme.color.visitedEmphasis,
                false: theme.color.controlBorder,
              }}
            />
          </Surface>
          <DataFeedback />
          <UndoNotice />
          <Button label="Show on map" onPress={() => onShowMap(id)} />
          {facts.length > 0 && (
            <Surface style={styles.facts}>
              <AppText variant="heading" accessibilityRole="header">
                At a glance
              </AppText>
              {facts.map(({ label, value }) => (
                <View key={label} style={styles.fact}>
                  <AppText variant="caption" tone="muted">
                    {label}
                  </AppText>
                  <AppText>{value}</AppText>
                </View>
              ))}
            </Surface>
          )}
        </>
      ) : (
        <AppText tone="muted">This place isn’t in the catalog.</AppText>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  section: { padding: theme.space.sm, gap: theme.space.xs },
  sectionLabel: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  home: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.lg,
    padding: theme.space.lg,
  },
  label: { flex: 1, gap: theme.space.xs },
  facts: { padding: theme.space.lg, gap: theme.space.lg },
  fact: { gap: theme.space.xs },
});
