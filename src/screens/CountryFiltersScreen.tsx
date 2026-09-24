import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { ChoiceRow } from '../components/ChoiceRow';
import { Sheet } from '../components/Sheet';
import { Surface } from '../components/Surface';
import { continents } from '../countries/catalog';
import {
  defaultCountryFilters,
  type CountryFilters,
} from '../countries/filters';
import { theme } from '../theme';
import { t } from '../localization';

export function CountryFiltersScreen({
  initialFilters,
  onApply,
  onCancel,
}: {
  initialFilters: CountryFilters;
  onApply: (filters: CountryFilters) => void;
  onCancel: () => void;
}) {
  const [filters, setFilters] = useState(initialFilters);
  return (
    <Sheet
      title={t('countries.filters')}
      doneLabel={t('common.apply')}
      onCancel={onCancel}
      onDone={() => onApply(filters)}
    >
      <Surface
        style={styles.section}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('countries.organization')}
      >
        <AppText variant="label" tone="muted" accessibilityRole="header">
          {t('countries.organization')}
        </AppText>
        <ChoiceRow
          label={t('countries.byContinent')}
          selected={filters.grouping === 'continent'}
          onPress={() => setFilters({ ...filters, grouping: 'continent' })}
        />
        <ChoiceRow
          label={t('countries.alphabetical')}
          selected={filters.grouping === 'alphabetical'}
          onPress={() => setFilters({ ...filters, grouping: 'alphabetical' })}
        />
      </Surface>
      <Surface
        style={styles.section}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('countries.continent')}
      >
        <AppText variant="label" tone="muted" accessibilityRole="header">
          {t('countries.continent')}
        </AppText>
        {[{ id: 'all', name: t('countries.allContinents') }, ...continents].map(
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
      </Surface>
      <Button
        label={t('countries.resetFilters')}
        variant="quiet"
        onPress={() => setFilters(defaultCountryFilters)}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  section: { padding: theme.space.md, gap: theme.space.sm },
});
