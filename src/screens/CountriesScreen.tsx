import { useCallback, useMemo, useState } from 'react';
import {
  Keyboard,
  LayoutAnimation,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { DataFeedback } from '../components/DataFeedback';
import { IconButton } from '../components/IconButton';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchField } from '../components/SearchField';
import { continents, countryById } from '../countries/catalog';
import { CountryBulkActions } from '../countries/CountryBulkActions';
import { CountryList } from '../countries/CountryList';
import { CountryScopeControl } from '../countries/CountryScopeControl';
import {
  selectCountrySections,
  type CountryFilters,
  type CountryScope,
} from '../countries/filters';
import { showStatusPicker } from '../countries/StatusPicker';
import type { CountryId } from '../countries/types';
import { useAppData } from '../data/AppDataProvider';
import { useReducedMotion } from '../motion/ReducedMotion';
import { useActionGuard } from '../navigation/useActionGuard';
import { getCountryRegionProgress } from '../places/filter';
import { PlaceKindControl, type PlacesMode } from '../places/PlaceKindControl';
import { theme } from '../theme';
import { t } from '../localization';

const emptySelection: ReadonlySet<string> = new Set();

export function CountriesScreen({
  filters,
  query,
  scope,
  intent,
  onQueryChange,
  onScopeChange,
  onOpenFilters,
  onResetFilters,
  onSelect,
  onOpenRegions,
  onModeChange,
}: {
  filters: CountryFilters;
  query: string;
  scope: CountryScope;
  intent?: string;
  onQueryChange: (query: string) => void;
  onScopeChange: (scope: CountryScope) => void;
  onOpenFilters: () => void;
  onResetFilters: () => void;
  onSelect: (id: CountryId) => void;
  onOpenRegions: (countryId: string) => void;
  onModeChange: (mode: PlacesMode) => void;
}) {
  const app = useAppData();
  const reducedMotion = useReducedMotion();
  const { setStatus, resetVersion } = app;
  const guard = useActionGuard(resetVersion);
  const { continent, grouping } = filters;
  const regionProgress = useMemo(
    () => getCountryRegionProgress(app.data.subdivisions),
    [app.data.subdivisions],
  );
  const sections = useMemo(
    () =>
      selectCountrySections(
        query,
        scope,
        { continent, grouping },
        app.data.places,
      ),
    [query, scope, continent, grouping, app.data.places],
  );
  const resultIds = useMemo(
    () => sections.flatMap(({ data }) => data.map(({ id }) => id)),
    [sections],
  );
  const filterKey = JSON.stringify([
    query,
    scope,
    continent,
    grouping,
    intent,
    resultIds,
    resetVersion,
  ]);
  const [selection, setSelection] = useState<{
    filterKey: string;
    ids: ReadonlySet<string>;
  } | null>(null);
  if (selection && selection.filterKey !== filterKey) setSelection(null);
  const selecting = selection?.filterKey === filterKey;
  const selectedIds = selecting ? selection.ids : emptySelection;
  const disabled = app.status !== 'ready' || app.busy;
  const hasFilters = continent !== 'all' || grouping !== 'continent';
  const continentName = continents.find(({ id }) => id === continent)?.name;
  const select = useCallback(
    (id: CountryId) => {
      Keyboard.dismiss();
      if (selecting) {
        setSelection((current) => {
          const ids = new Set(
            current?.filterKey === filterKey ? current.ids : [],
          );
          if (ids.has(id)) ids.delete(id);
          else ids.add(id);
          return { filterKey, ids };
        });
      } else onSelect(id);
    },
    [selecting, filterKey, onSelect],
  );
  const changeStatus = useCallback(
    (id: CountryId) => {
      Keyboard.dismiss();
      const isCurrent = guard();
      showStatusPicker(countryById.get(id)!.name, (status) => {
        if (isCurrent())
          void setStatus([id], status, { preserveLived: false });
      });
    },
    [guard, setStatus],
  );
  function endSelection() {
    Keyboard.dismiss();
    if (!reducedMotion) LayoutAnimation.easeInEaseOut();
    setSelection(null);
  }

  return (
    <Screen onAccessibilityEscape={selecting ? endSelection : undefined}>
      <CountryList
        header={
          <>
            <ScreenHeader
              title={t('places.title')}
              subtitle={continentName ?? t('countries.subtitle')}
            >
              <IconButton
                name="filter"
                color={hasFilters ? theme.color.accent : theme.color.textMuted}
                accessibilityLabel={
                  hasFilters
                    ? t('countries.filtersApplied')
                    : t('countries.filters')
                }
                disabled={disabled}
                onPress={() => {
                  Keyboard.dismiss();
                  onOpenFilters();
                }}
              />
            </ScreenHeader>
            <View style={styles.controls}>
              <PlaceKindControl value="countries" onChange={onModeChange} />
              <SearchField
                value={query}
                onChangeText={onQueryChange}
                placeholder={t('countries.search')}
                accessibilityLabel={t('countries.searchLabel')}
              />
              <CountryScopeControl value={scope} onChange={onScopeChange} />
            </View>
            <DataFeedback />
          </>
        }
        scrollResetKey={JSON.stringify([scope, continent, grouping, intent])}
        sections={sections}
        places={app.data.places}
        homeCountryId={app.data.homeCountryId}
        ready={app.status === 'ready'}
        disabled={disabled}
        onChangeStatus={changeStatus}
        onSelect={select}
        regionProgress={regionProgress}
        onOpenRegions={onOpenRegions}
        onReset={onResetFilters}
        scope={scope}
        narrowed={query.trim() !== '' || continent !== 'all'}
        selecting={selecting}
        selectedIds={selectedIds}
        onStartSelection={() => {
          Keyboard.dismiss();
          if (!reducedMotion) LayoutAnimation.easeInEaseOut();
          setSelection({ filterKey, ids: emptySelection });
        }}
      />
      {selecting && (
        <ScrollView
          style={styles.footer}
          bounces={false}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          scrollsToTop={false}
        >
          <CountryBulkActions
            resultIds={resultIds}
            selectedIds={selectedIds}
            onSelectionChange={(ids) => setSelection({ filterKey, ids })}
            onEndSelection={endSelection}
          />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { gap: theme.space.md, paddingBottom: theme.space.md },
  footer: { flexGrow: 0, maxHeight: '40%', marginVertical: theme.space.sm },
});
