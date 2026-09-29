import { useCallback, useMemo, useState } from 'react';
import {
  Keyboard,
  LayoutAnimation,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { DataFeedback } from '../components/DataFeedback';
import { ChoiceMenu } from '../components/ChoiceMenu';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchField } from '../components/SearchField';
import { countryById } from '../countries/catalog';
import { CountryBulkActions } from '../countries/CountryBulkActions';
import { CountryList } from '../countries/CountryList';
import { CountryScopeControl } from '../countries/CountryScopeControl';
import { PlaceFilterBar } from '../places/PlaceFilterBar';
import type { PlaceLocation } from '../places/location';
import {
  selectCountrySections,
  type CountryScope,
} from '../countries/filters';
import { showStatusPicker } from '../countries/StatusPicker';
import type { CountryId } from '../countries/types';
import { appData } from '../data/app-data';
import { getHomeCountryId } from '../data/model';
import { useAppData } from '../data/AppData';
import { useReducedMotion } from '../motion/ReducedMotion';
import { useActionGuard } from '../navigation/useActionGuard';
import { getCountryRegionProgress } from '../places/filter';
import { PlaceKindControl, type PlacesMode } from '../places/PlaceKindControl';
import { theme } from '../theme';
import { t } from '../localization';

const emptySelection: ReadonlySet<string> = new Set();

export function CountriesScreen({
  query,
  scope,
  intent,
  location,
  onQueryChange,
  onScopeChange,
  onOpenLocation,
  onResetFilters,
  onSelect,
  onOpenRegions,
  onModeChange,
}: {
  query: string;
  scope: CountryScope;
  intent?: string;
  location: PlaceLocation;
  onQueryChange: (query: string) => void;
  onScopeChange: (scope: CountryScope) => void;
  onOpenLocation: () => void;
  onResetFilters: () => void;
  onSelect: (id: CountryId) => void;
  onOpenRegions: (countryId: string) => void;
  onModeChange: (mode: PlacesMode) => void;
}) {
  const { setStatus } = appData;
  const grouping = useAppData((snapshot) => snapshot.data.preferences.countryGrouping);
  const places = useAppData((snapshot) => snapshot.data.places);
  const homeCountryId = useAppData((snapshot) => getHomeCountryId(snapshot.data));
  const dataStatus = useAppData((snapshot) => snapshot.status);
  const busy = useAppData((snapshot) => snapshot.busy);
  const resetVersion = useAppData((snapshot) => snapshot.resetVersion);
  const reducedMotion = useReducedMotion();
  const guard = useActionGuard(resetVersion);
  const continent = location.kind === 'continent' ? location.id : 'all';
  const searching = query.trim() !== '';
  const narrowed = searching || continent !== 'all';
  const regionProgress = useMemo(
    () => getCountryRegionProgress(places),
    [places],
  );
  const sections = useMemo(
    () =>
      selectCountrySections(
        query,
        scope,
        { continent, grouping },
        places,
      ),
    [query, scope, continent, grouping, places],
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
  const disabled = dataStatus !== 'ready' || busy;
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
          void setStatus([id], status, { preserveLived: false, isCurrent });
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
            >
              <ChoiceMenu
                title={t('countries.organization')}
                value={grouping}
                options={[
                  { value: 'continent', label: t('countries.byContinent') },
                  { value: 'alphabetical', label: t('countries.alphabetical') },
                ]}
                disabled={disabled}
                onChange={(countryGrouping) => appData.updatePreferences({ countryGrouping })}
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
              <PlaceFilterBar location={location} onOpenLocation={onOpenLocation}>
                <CountryScopeControl value={scope} onChange={onScopeChange} />
              </PlaceFilterBar>
            </View>
            <DataFeedback />
          </>
        }
        scrollResetKey={JSON.stringify([query, scope, continent, grouping, intent])}
        sections={sections}
        places={places}
        homeCountryId={homeCountryId}
        ready={dataStatus === 'ready'}
        disabled={disabled}
        onChangeStatus={changeStatus}
        onSelect={select}
        regionProgress={regionProgress}
        onOpenRegions={onOpenRegions}
        emptyAction={{
          label: t(searching ? 'common.clearSearch' : narrowed ? 'countries.resetFilters' : 'countries.empty.browse'),
          onPress: () => { Keyboard.dismiss(); if (searching) onQueryChange(''); else onResetFilters(); },
        }}
        scope={scope}
        narrowed={narrowed}
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
