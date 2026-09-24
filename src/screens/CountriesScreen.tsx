import { useCallback, useMemo, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { IconButton } from '../components/IconButton';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchField } from '../components/SearchField';
import { continents } from '../countries/catalog';
import { CountryList } from '../countries/CountryList';
import {
  defaultCountryFilters,
  selectCountrySections,
  type CountryFilters,
  type VisitFilter,
} from '../countries/filters';
import type { CountryId } from '../countries/types';
import { VisitsFeedback } from '../countries/VisitsFeedback';
import { useVisits } from '../countries/VisitsProvider';
import { VisitStatusControl } from '../countries/VisitStatusControl';
import { theme } from '../theme';

export function CountriesScreen({
  filters,
  onOpenFilters,
  onResetFilters,
  onSelect,
}: {
  filters: CountryFilters;
  onOpenFilters: () => void;
  onResetFilters: () => void;
  onSelect: (id: CountryId) => void;
}) {
  const [query, setQuery] = useState('');
  const [visitFilter, setVisitFilter] = useState<VisitFilter>('all');
  const visits = useVisits();
  const { continent, grouping } = filters;
  const sections = useMemo(
    () =>
      selectCountrySections(
        query,
        visitFilter,
        { continent, grouping },
        visits.visitedIds,
      ),
    [query, visitFilter, continent, grouping, visits.visitedIds],
  );
  const hasFilters =
    continent !== defaultCountryFilters.continent ||
    grouping !== defaultCountryFilters.grouping;
  const continentName = continents.find(({ id }) => id === continent)?.name;
  const resultCount = sections.reduce(
    (count, section) => count + section.data.length,
    0,
  );
  const select = useCallback(
    (id: CountryId) => {
      Keyboard.dismiss();
      onSelect(id);
    },
    [onSelect],
  );

  return (
    <Screen>
      <CountryList
        header={
          <>
            <ScreenHeader
              title="Countries"
              subtitle={continentName ?? 'Countries & territories'}
            >
              <IconButton
                name="filter"
                color={hasFilters ? theme.color.accent : theme.color.textMuted}
                accessibilityLabel={
                  hasFilters ? 'Filters, custom options applied' : 'Filters'
                }
                onPress={() => {
                  Keyboard.dismiss();
                  onOpenFilters();
                }}
              />
            </ScreenHeader>
            <View style={styles.controls}>
              <SearchField
                value={query}
                onChangeText={setQuery}
                placeholder="Find a country or territory"
                accessibilityLabel="Search countries and territories"
                onSubmitEditing={Keyboard.dismiss}
              />
              <VisitStatusControl value={visitFilter} onChange={setVisitFilter} />
            </View>
            <VisitsFeedback {...visits} />
          </>
        }
        scrollResetKey={JSON.stringify([
          visitFilter,
          continent,
          grouping,
        ])}
        sections={sections}
        resultCount={resultCount}
        visitedIds={visits.visitedIds}
        ready={visits.status === 'ready'}
        onVisitedChange={visits.setVisited}
        onSelect={select}
        onReset={() => {
          setQuery('');
          setVisitFilter('all');
          onResetFilters();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { gap: theme.space.md, paddingBottom: theme.space.md },
});
