import { useState } from 'react';

import { Button } from '../components/Button';
import { ChoiceRow } from '../components/ChoiceRow';
import { ChoiceSection } from '../components/ChoiceSection';
import { Sheet } from '../components/Sheet';
import { continents } from '../countries/catalog';
import {
  defaultCountryFilters,
  type CountryFilters,
} from '../countries/filters';
import { t } from '../localization';

export function CountryFiltersScreen({
  initialFilters,
  showGrouping = true,
  onApply,
  onCancel,
}: {
  initialFilters: CountryFilters;
  showGrouping?: boolean;
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
      {showGrouping && (
        <ChoiceSection title={t('countries.organization')}>
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
        </ChoiceSection>
      )}
      <ChoiceSection title={t('countries.continent')}>
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
      </ChoiceSection>
      <Button
        label={t('countries.resetFilters')}
        variant="quiet"
        onPress={() => setFilters(defaultCountryFilters)}
      />
    </Sheet>
  );
}
