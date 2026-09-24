import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { ChoiceRow } from '../components/ChoiceRow';
import { Sheet } from '../components/Sheet';
import { continents } from '../countries/catalog';
import {
  defaultCountryFilters,
  type CountryFilters,
} from '../countries/filters';
import { theme } from '../theme';

export function CountryFiltersScreen({
  initialFilters,
  onApply,
}: {
  initialFilters: CountryFilters;
  onApply: (filters: CountryFilters) => void;
}) {
  const [filters, setFilters] = useState(initialFilters);
  return (
    <Sheet title="Filters" onDone={() => onApply(filters)}>
      <View
        style={styles.section}
        accessibilityRole="radiogroup"
        accessibilityLabel="Organization"
      >
        <AppText variant="label" tone="muted" accessibilityRole="header">
          Organization
        </AppText>
        <ChoiceRow
          label="By continent"
          selected={filters.grouping === 'continent'}
          onPress={() => setFilters({ ...filters, grouping: 'continent' })}
        />
        <ChoiceRow
          label="A–Z"
          selected={filters.grouping === 'alphabetical'}
          onPress={() => setFilters({ ...filters, grouping: 'alphabetical' })}
        />
      </View>
      <View
        style={styles.section}
        accessibilityRole="radiogroup"
        accessibilityLabel="Continent"
      >
        <AppText variant="label" tone="muted" accessibilityRole="header">
          Continent
        </AppText>
        {[{ id: 'all', name: 'All continents' }, ...continents].map(
          (continent) => (
            <ChoiceRow
              key={continent.id}
              label={continent.name}
              selected={filters.continent === continent.id}
              onPress={() =>
                setFilters({ ...filters, continent: continent.id })
              }
            />
          ),
        )}
      </View>
      <Button
        label="Reset filters"
        variant="quiet"
        onPress={() => setFilters(defaultCountryFilters)}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({ section: { gap: theme.space.xs } });
