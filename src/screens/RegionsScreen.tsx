import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { FlatList, Keyboard, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { IconButton } from '../components/IconButton';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchField } from '../components/SearchField';
import { continents } from '../countries/catalog';
import { CountryScopeControl } from '../countries/CountryScopeControl';
import type { CountryScope } from '../countries/filters';
import { showStatusPicker } from '../countries/StatusPicker';
import { useAppData } from '../data/AppDataProvider';
import { formatNumber, t } from '../localization';
import { useActionGuard } from '../navigation/useActionGuard';
import { formatPlaceName, getPlace, type Place } from '../places/catalog';
import { selectRegions } from '../places/filter';
import { PlaceKindControl, type PlacesMode } from '../places/PlaceKindControl';
import { subdivisionById } from '../subdivisions/catalog';
import { SubdivisionRow } from '../subdivisions/SubdivisionRow';
import { getCountrySubdivisionTerminology } from '../subdivisions/terminology';
import { theme } from '../theme';

export function RegionsScreen({
  continent,
  query,
  scope,
  intent,
  onQueryChange,
  onScopeChange,
  onModeChange,
  onOpenFilters,
  onResetFilters,
  onSelect,
}: {
  continent: string;
  query: string;
  scope: CountryScope;
  intent?: string;
  onQueryChange: (query: string) => void;
  onScopeChange: (scope: CountryScope) => void;
  onModeChange: (mode: PlacesMode) => void;
  onOpenFilters: () => void;
  onResetFilters: () => void;
  onSelect: (id: string) => void;
}) {
  const app = useAppData();
  const terminology = getCountrySubdivisionTerminology();
  const { setSubdivisionStatus, resetVersion } = app;
  const list = useRef<FlatList<Place>>(null);
  const guard = useActionGuard(resetVersion);
  useLayoutEffect(() => {
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [query, scope, continent, intent]);
  const regions = useMemo(
    () => selectRegions(query, scope, continent, app.data.subdivisions),
    [query, scope, continent, app.data.subdivisions],
  );
  const disabled = app.status !== 'ready' || app.busy;
  const hasFilters = continent !== 'all';
  const select = useCallback(
    (id: string) => {
      Keyboard.dismiss();
      onSelect(id);
    },
    [onSelect],
  );
  const changeStatus = useCallback(
    (id: string) => {
      Keyboard.dismiss();
      const region = getPlace(id);
      const isCurrent = guard();
      if (!region || !isCurrent()) return;
      showStatusPicker(formatPlaceName(region), (status) => {
        if (isCurrent())
          void setSubdivisionStatus([id], status, { preserveLived: false });
      });
    },
    [guard, setSubdivisionStatus],
  );

  return (
    <Screen>
      <FlatList
        ref={list}
        data={app.status === 'ready' ? regions : []}
        extraData={{ statuses: app.data.subdivisions, disabled }}
        keyExtractor={(region) => region.id}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <>
            <ScreenHeader
              title={t('places.title')}
              subtitle={
                continents.find(({ id }) => id === continent)?.name ??
                t('places.regionSubtitle')
              }
            >
              <IconButton
                name="filter"
                color={hasFilters ? theme.color.accent : theme.color.textMuted}
                accessibilityLabel={t(
                  hasFilters ? 'countries.filtersApplied' : 'countries.filters',
                )}
                disabled={disabled}
                onPress={() => {
                  Keyboard.dismiss();
                  onOpenFilters();
                }}
              />
            </ScreenHeader>
            <View style={styles.controls}>
              <PlaceKindControl value="regions" onChange={onModeChange} />
              <SearchField
                value={query}
                onChangeText={onQueryChange}
                placeholder={t('places.searchRegions')}
                accessibilityLabel={t('places.searchRegions')}
              />
              <CountryScopeControl value={scope} onChange={onScopeChange} />
              <DataFeedback />
              {app.status === 'ready' && (
                <AppText variant="caption" tone="muted" style={styles.count}>
                  {t('subdivisions.count', {
                    ...terminology,
                    count: regions.length,
                    amount: formatNumber(regions.length),
                  })}
                </AppText>
              )}
            </View>
          </>
        }
        renderItem={({ item }) => (
          <SubdivisionRow
            region={subdivisionById.get(item.id)!}
            countryName={item.countryName}
            selecting={false}
            selected={false}
            status={app.data.subdivisions[item.id] ?? 'unvisited'}
            disabled={disabled}
            onPress={select}
            onChangeStatus={changeStatus}
          />
        )}
        ListEmptyComponent={
          app.status === 'ready' ? (
            <View style={styles.empty}>
              <AppText variant="heading">
                {t('subdivisions.noResults', terminology)}
              </AppText>
              <AppText tone="muted">
                {t('subdivisions.noResultsHint', terminology)}
              </AppText>
              <Button
                label={t('subdivisions.showAll', terminology)}
                variant="quiet"
                onPress={onResetFilters}
              />
            </View>
          ) : null
        }
        ListFooterComponent={
          <AppText variant="caption" tone="muted" style={styles.coverage}>
            {t('subdivisions.coverageNote')}
          </AppText>
        }
      />
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.space.xl },
  controls: { gap: theme.space.md, paddingBottom: theme.space.md },
  count: { paddingHorizontal: theme.space.lg, paddingVertical: theme.space.sm },
  separator: { height: theme.space.sm },
  empty: { padding: theme.space.xl, gap: theme.space.md, alignItems: 'center' },
  coverage: { paddingVertical: theme.space.xl },
});
