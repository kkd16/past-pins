import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { useScreenReaderEnabled } from '../accessibility/useScreenReaderEnabled';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { Screen } from '../components/Screen';
import { SearchField } from '../components/SearchField';
import { Surface } from '../components/Surface';
import { countryById } from '../countries/catalog';
import { CountryScopeControl } from '../countries/CountryScopeControl';
import type { CountryScope } from '../countries/filters';
import { showStatusPicker } from '../countries/StatusPicker';
import { useAppData } from '../data/AppDataProvider';
import { getSubdivisionStatus } from '../data/model';
import { formatNumber, t } from '../localization';
import { useActionGuard } from '../navigation/useActionGuard';
import { PlaceSelectionCard } from '../places/PlaceSelectionCard';
import { subdivisionById } from '../subdivisions/catalog';
import { SubdivisionMap } from '../subdivisions/SubdivisionMap';
import { SubdivisionRow } from '../subdivisions/SubdivisionRow';
import {
  SubdivisionViewControl,
  type SubdivisionView,
} from '../subdivisions/SubdivisionViewControl';
import {
  getSubdivisionStatistics,
  selectSubdivisions,
} from '../subdivisions/tracking';
import {
  getCountrySubdivisionTerminology,
  getSubdivisionKindLabel,
} from '../subdivisions/terminology';
import { theme } from '../theme';

const emptySelection: ReadonlySet<string> = new Set();

export function SubdivisionsScreen({
  countryId,
  onBrowse,
  onOpenCountry,
  initialSelectedId,
  initialScope = 'all',
  onSaveToLists,
}: {
  countryId: string;
  onBrowse: () => void;
  onOpenCountry: () => void;
  initialSelectedId?: string;
  initialScope?: CountryScope;
  onSaveToLists: (id: string) => void;
}) {
  const app = useAppData();
  const screenReader = useScreenReaderEnabled();
  const { setSubdivisionStatus } = app;
  const country = countryById.get(countryId);
  const terminology = getCountrySubdivisionTerminology(countryId);
  const [view, setView] = useState<SubdivisionView>(
    initialSelectedId || initialScope === 'all' ? 'map' : 'list',
  );
  const [mapLoaded, setMapLoaded] = useState(view === 'map');
  if (view === 'map' && !mapLoaded) setMapLoaded(true);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<CountryScope>(initialScope);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    initialSelectedId &&
    subdivisionById.get(initialSelectedId)?.countryId === countryId
      ? initialSelectedId
      : null,
  );
  const [focusRequest, setFocusRequest] = useState(0);
  const selectedRegion = selectedId
    ? subdivisionById.get(selectedId)
    : undefined;
  const results = useMemo(
    () => selectSubdivisions(countryId, query, scope, app.data.subdivisions),
    [countryId, query, scope, app.data.subdivisions],
  );
  const resultIds = useMemo(
    () => results.map((region) => region.id),
    [results],
  );
  const filterKey = JSON.stringify([
    countryId,
    query,
    scope,
    resultIds,
    app.resetVersion,
  ]);
  const [selection, setSelection] = useState<{
    key: string;
    ids: ReadonlySet<string>;
  } | null>(null);
  if (selection && selection.key !== filterKey) setSelection(null);
  const selecting = selection?.key === filterKey;
  const selectedIds = selecting ? selection.ids : emptySelection;
  const selectionCount = {
    ...terminology,
    count: selectedIds.size,
    amount: formatNumber(selectedIds.size),
  };
  const editScope = useMemo(
    () => ({ filterKey, selectedIds }),
    [filterKey, selectedIds],
  );
  const guard = useActionGuard(editScope);
  const stats = useMemo(
    () => getSubdivisionStatistics(app.data.subdivisions, countryId),
    [app.data.subdivisions, countryId],
  );
  const disabled = app.status !== 'ready' || app.busy;

  const changeStatus = useCallback(
    (id: string) => {
      Keyboard.dismiss();
      const region = subdivisionById.get(id);
      const isCurrent = guard();
      if (region)
        showStatusPicker(region.name, (status) => {
          if (!isCurrent()) return;
          void setSubdivisionStatus([id], status, { preserveLived: false });
        });
    },
    [guard, setSubdivisionStatus],
  );

  const pressRow = useCallback(
    (id: string) => {
      if (!selecting) {
        Keyboard.dismiss();
        setSelectedId(id);
        setFocusRequest((request) => request + 1);
        setView('map');
        return;
      }
      setSelection((current) => {
        const ids = new Set(current?.key === filterKey ? current.ids : []);
        if (ids.has(id)) ids.delete(id);
        else ids.add(id);
        return { key: filterKey, ids };
      });
    },
    [selecting, filterKey],
  );

  function showAll() {
    setQuery('');
    setScope('all');
    setSelection(null);
  }

  if (!country || stats.total === 0)
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.empty}>
          <AppText variant="heading">{t('subdivisions.unavailable')}</AppText>
          <AppText tone="muted">{t('subdivisions.unavailableHint')}</AppText>
          <Button
            label={t('subdivisions.browseCountries')}
            onPress={onBrowse}
          />
        </ScrollView>
      </Screen>
    );

  return (
    <Screen
      style={styles.screen}
      onAccessibilityEscape={
        selecting
          ? () => setSelection(null)
          : view === 'map' && selectedId
            ? () => setSelectedId(null)
            : undefined
      }
    >
      <ScrollView
        style={styles.viewControl}
        contentContainerStyle={styles.viewControlContent}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        bounces={false}
        scrollsToTop={false}
      >
        <SubdivisionViewControl
          value={view}
          onChange={(next) => {
            Keyboard.dismiss();
            setSelection(null);
            setView(next);
          }}
        />
      </ScrollView>
      <View style={styles.panes}>
        {mapLoaded && (
          <View
            style={[styles.mapPane, { opacity: view === 'map' ? 1 : 0 }]}
            pointerEvents={view === 'map' ? 'auto' : 'none'}
            accessibilityElementsHidden={view !== 'map'}
          >
            <SubdivisionMap
              countryId={countryId}
              statuses={app.data.subdivisions}
              selectedId={selectedId}
              focusRequest={focusRequest}
              onSelect={setSelectedId}
              disabled={disabled}
              active={view === 'map'}
            />
            <ScrollView
              key={selectedId ?? 'summary'}
              style={styles.mapDock}
              contentContainerStyle={styles.mapDockContent}
              contentInsetAdjustmentBehavior="never"
              bounces={false}
              scrollsToTop={false}
            >
              <DataFeedback />
              {selectedRegion && app.status === 'ready' && (
                <PlaceSelectionCard
                  title={selectedRegion.name}
                  subtitle={getSubdivisionKindLabel(selectedRegion.kind)}
                  status={getSubdivisionStatus(app.data, selectedRegion.id)}
                  disabled={disabled}
                  onChangeStatus={(status) => {
                    void setSubdivisionStatus([selectedRegion.id], status, {
                      preserveLived: false,
                    });
                  }}
                  onSaveToLists={() => onSaveToLists(selectedRegion.id)}
                  onDismiss={() => setSelectedId(null)}
                  autofocus={screenReader && view === 'map'}
                >
                  <Button
                    label={t('subdivisions.countryDetails', {
                      country: country.name,
                    })}
                    variant="quiet"
                    onPress={onOpenCountry}
                  />
                </PlaceSelectionCard>
              )}
              {!selectedRegion && app.status === 'ready' && (
                <AppText variant="label" tone="visited">
                  {t('subdivisions.visitedSummary', {
                    ...terminology,
                    visited: formatNumber(stats.visited),
                    total: formatNumber(stats.total),
                  })}
                </AppText>
              )}
            </ScrollView>
          </View>
        )}
        {view === 'list' && (
          <>
            <FlatList
              data={app.status === 'ready' ? results : []}
              keyExtractor={(region) => region.id}
              extraData={{
                statuses: app.data.subdivisions,
                selecting,
                selectedIds,
                disabled,
              }}
              contentInsetAdjustmentBehavior="never"
              contentContainerStyle={styles.content}
              automaticallyAdjustKeyboardInsets
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              ItemSeparatorComponent={Separator}
              ListHeaderComponent={
                <View style={styles.header}>
                  <SearchField
                    value={query}
                    onChangeText={setQuery}
                    placeholder={t('subdivisions.search', terminology)}
                    accessibilityLabel={t('subdivisions.search', terminology)}
                  />
                  <CountryScopeControl value={scope} onChange={setScope} />
                  <DataFeedback />
                  {app.status === 'ready' && (
                    <View style={styles.actions}>
                      <View style={styles.grow}>
                        <AppText variant="caption" tone="muted">
                          {t('subdivisions.count', {
                            ...terminology,
                            count: results.length,
                            amount: formatNumber(results.length),
                          })}
                        </AppText>
                        <AppText variant="caption" tone="visited">
                          {t('subdivisions.visitedSummary', {
                            ...terminology,
                            visited: formatNumber(stats.visited),
                            total: formatNumber(stats.total),
                          })}
                        </AppText>
                      </View>
                      {!selecting && (
                        <Button
                          label={t('subdivisions.select', terminology)}
                          variant="quiet"
                          disabled={disabled || results.length === 0}
                          onPress={() => {
                            Keyboard.dismiss();
                            setSelection({ key: filterKey, ids: emptySelection });
                          }}
                        />
                      )}
                    </View>
                  )}
                  <Button
                    label={t('subdivisions.countryDetails', {
                      country: country.name,
                    })}
                    variant="quiet"
                    onPress={() => {
                      Keyboard.dismiss();
                      onOpenCountry();
                    }}
                  />
                </View>
              }
              renderItem={({ item }) => (
                <SubdivisionRow
                  region={item}
                  status={getSubdivisionStatus(app.data, item.id)}
                  disabled={disabled}
                  selecting={selecting}
                  selected={selectedIds.has(item.id)}
                  onPress={pressRow}
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
                      onPress={showAll}
                    />
                  </View>
                ) : null
              }
              ListFooterComponent={
                <View style={styles.coverage}>
                  <AppText variant="caption" tone="muted">
                    {t('subdivisions.independentTracking', terminology)}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {t('subdivisions.coverageNote')}
                  </AppText>
                </View>
              }
            />
            {selecting && (
              <ScrollView
                style={styles.footer}
                contentInsetAdjustmentBehavior="never"
                keyboardShouldPersistTaps="handled"
                scrollsToTop={false}
              >
                <Surface style={styles.bulk}>
                  <AppText variant="label">
                    {t('subdivisions.selectedCount', selectionCount)}
                  </AppText>
                  <View style={styles.actions}>
                    <Button
                      variant="quiet"
                      label={
                        selectedIds.size === results.length
                          ? t('countries.deselectAll')
                          : t('countries.selectAll')
                      }
                      disabled={disabled}
                      onPress={() =>
                        setSelection({
                          key: filterKey,
                          ids:
                            selectedIds.size === results.length
                              ? emptySelection
                              : new Set(resultIds),
                        })
                      }
                    />
                    <Button
                      variant="quiet"
                      label={t('common.done')}
                      onPress={() => setSelection(null)}
                    />
                  </View>
                  <Button
                    label={t('subdivisions.updateCount', selectionCount)}
                    disabled={disabled || selectedIds.size === 0}
                    onPress={() => {
                      Keyboard.dismiss();
                      const isCurrent = guard();
                      showStatusPicker(
                        t('subdivisions.selectedCount', selectionCount),
                        (status) => {
                          if (!isCurrent()) return;
                          void setSubdivisionStatus([...selectedIds], status).then(
                            (changed) => {
                              if (changed) setSelection(null);
                            },
                          );
                        },
                      );
                    }}
                  />
                </Surface>
              </ScrollView>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0, paddingTop: 0 },
  viewControl: { flexGrow: 0, maxHeight: '30%' },
  viewControlContent: { padding: theme.space.lg },
  panes: { flex: 1 },
  mapPane: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.globe.ocean,
  },
  mapDock: { flexGrow: 0, maxHeight: '45%' },
  mapDockContent: { padding: theme.space.lg, gap: theme.space.sm },
  content: {
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.xl,
  },
  header: {
    gap: theme.space.md,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.sm,
  },
  grow: { flex: 1 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  separator: { height: theme.space.sm },
  empty: { padding: theme.space.xl, gap: theme.space.md, alignItems: 'center' },
  coverage: { paddingVertical: theme.space.xl, gap: theme.space.sm },
  footer: {
    flexGrow: 0,
    maxHeight: '40%',
    marginVertical: theme.space.sm,
    marginHorizontal: theme.space.lg,
  },
  bulk: { padding: theme.space.md, gap: theme.space.sm },
});
