import { useCallback, useMemo, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { IconButton } from '../components/IconButton';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchField } from '../components/SearchField';
import { UndoNotice } from '../components/UndoNotice';
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
import { theme } from '../theme';
import { t, formatNumber } from '../localization';

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
}) {
  const app = useAppData();
  const { setStatus } = app;
  const { continent, grouping } = filters;
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
  const resultIds = sections.flatMap(({ data }) => data.map(({ id }) => id));
  const filterKey = JSON.stringify([
    query,
    scope,
    continent,
    grouping,
    intent,
    resultIds,
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
      showStatusPicker(countryById.get(id)!.name, (status) => {
        void setStatus([id], status, { preserveLived: false });
      });
    },
    [setStatus],
  );

  return (
    <Screen>
      <CountryList
        header={
          <>
            <ScreenHeader
              title={t('countries.title')}
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
              <SearchField
                value={query}
                onChangeText={onQueryChange}
                placeholder={t('countries.search')}
                accessibilityLabel={t('countries.searchLabel')}
                onSubmitEditing={Keyboard.dismiss}
              />
              <CountryScopeControl value={scope} onChange={onScopeChange} />
              <View style={styles.selectionActions}>
                {selecting && (
                  <AppText
                    variant="caption"
                    tone="muted"
                    style={styles.selectionLabel}
                  >
                    {t('countries.selectedCount', {
                      count: selectedIds.size,
                      amount: formatNumber(selectedIds.size),
                    })}
                  </AppText>
                )}
                <Button
                  label={selecting ? t('common.cancel') : t('countries.select')}
                  variant="quiet"
                  disabled={disabled || (!selecting && resultIds.length === 0)}
                  onPress={() => {
                    Keyboard.dismiss();
                    setSelection(
                      selecting ? null : { filterKey, ids: emptySelection },
                    );
                  }}
                />
              </View>
            </View>
            <DataFeedback />
            <UndoNotice />
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
        onReset={onResetFilters}
        scope={scope}
        narrowed={query.trim() !== '' || continent !== 'all'}
        selecting={selecting}
        selectedIds={selectedIds}
      />
      {selecting && (
        <CountryBulkActions
          resultIds={resultIds}
          selectedIds={selectedIds}
          onSelectionChange={(ids) => setSelection({ filterKey, ids })}
          onComplete={() => setSelection(null)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { gap: theme.space.md, paddingBottom: theme.space.md },
  selectionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: theme.space.md,
  },
  selectionLabel: { flex: 1, paddingStart: theme.space.lg },
});
