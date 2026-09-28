import { Stack } from 'expo-router';
import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  StyleSheet,
  View,
} from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Checkmark } from '../components/Checkmark';
import { ChoiceControl } from '../components/ChoiceControl';
import { DataFeedback } from '../components/DataFeedback';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { SearchField } from '../components/SearchField';
import { countryById } from '../countries/catalog';
import { appData } from '../data/app-data';
import { useAppData } from '../data/AppData';
import type { TravelList } from '../data/model';
import { formatNumber, t } from '../localization';
import { getPlaceSubtitle, type Place } from '../places/catalog';
import { usePlaceSearch } from '../places/usePlaceSearch';
import { PlaceSearchFooter } from '../places/PlaceFeedback';
import { PlaceKindControl, type PlacesMode } from '../places/PlaceKindControl';
import { theme } from '../theme';

type Props = {
  id: string;
  onDone: () => void;
  onCancel: () => void;
};

export function ListPlacesScreen(props: Props) {
  const list = useAppData((snapshot) => snapshot.data.lists.find(({ id }) => id === props.id));
  const status = useAppData((snapshot) => snapshot.status);
  if (list && status === 'ready')
    return <ListPlacesEditor {...props} list={list} />;

  return (
    <Screen onAccessibilityEscape={props.onCancel}>
      <Stack.Screen
        options={{
          title: t('lists.editPlaces'),
          headerLeft: () => (
            <Button
              label={t('common.cancel')}
              variant="quiet"
              onPress={props.onCancel}
            />
          ),
          headerRight: () => null,
        }}
      />
      <DataFeedback />
      {status === 'ready' && (
        <AppText tone="muted" style={styles.empty}>
          {t('lists.unavailable')}
        </AppText>
      )}
    </Screen>
  );
}

function ListPlacesEditor({
  id,
  list,
  onDone,
  onCancel,
}: Props & { list: TravelList }) {
  const { setListPlaces } = appData;
  const busy = useAppData((snapshot) => snapshot.busy);
  const status = useAppData((snapshot) => snapshot.status);
  const [originalPlaces] = useState(list.placeIds);
  const [selected, setSelected] = useState(() => new Set(originalPlaces));
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'selected'>('all');
  const [countryId, setCountryId] = useState<string>();
  const [mode, setMode] = useState<PlacesMode>('countries');
  const results = useRef<FlatList<Place>>(null);
  const exited = useRef(false);
  const stale = list.placeIds !== originalPlaces;
  const disabled = stale || busy || status !== 'ready';
  const changed =
    selected.size !== originalPlaces.length ||
    originalPlaces.some((placeId) => !selected.has(placeId));
  const scopes = [
    { value: 'all', label: t('lists.allPlaces') },
    { value: 'selected', label: t('lists.selected') },
  ] as const;
  const found = usePlaceSearch({
    query, countryId,
    scope: scope === 'selected' ? 'all' : mode === 'cities' ? 'city' : mode === 'regions' ? 'region' : 'country',
    ids: scope === 'selected' ? [...selected] : undefined,
  });
  useLayoutEffect(() => {
    results.current?.scrollToOffset({ offset: 0, animated: false });
  }, [query, scope, countryId, mode]);

  const toggle = useCallback((placeId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }, []);

  function changeScope(value: typeof scope) {
    setScope(value);
    setCountryId(undefined);
  }

  const browseCountry = useCallback((nextCountryId?: string) => {
    setCountryId(nextCountryId);
    setMode(nextCountryId ? 'cities' : 'countries');
    setQuery('');
    setScope('all');
    Keyboard.dismiss();
  }, []);

  function cancel() {
    if (exited.current) return;
    exited.current = true;
    Keyboard.dismiss();
    onCancel();
  }

  function save() {
    if (disabled || !changed || exited.current) return;
    if (setListPlaces(id, [...selected])) {
      exited.current = true;
      Keyboard.dismiss();
      onDone();
    }
  }

  return (
    <Screen onAccessibilityEscape={cancel}>
      <Stack.Screen
        options={{
          title: t('lists.editPlaces'),
          headerLeft: () => (
            <Button
              label={t('common.cancel')}
              variant="quiet"
              onPress={cancel}
            />
          ),
          headerRight: () => (
            <Button
              label={t('lists.save')}
              variant="quiet"
              disabled={disabled || !changed}
              onPress={save}
            />
          ),
        }}
      />
      <FlatList
        ref={results}
        data={found.places}
        extraData={selected}
        keyExtractor={(place) => place.id}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.summary}>
              <AppText variant="heading" accessibilityRole="header">
                {list.name}
              </AppText>
              <AppText tone="muted">
                {t('lists.selectedCount', {
                  count: selected.size,
                  amount: formatNumber(selected.size),
                })}
              </AppText>
              <AppText variant="caption" tone="muted">
                {t('lists.independent')}
              </AppText>
            </View>
            <DataFeedback />
            {stale && (
              <AppText tone="muted">{t('lists.changedElsewhere')}</AppText>
            )}
            {countryId && (
              <View style={styles.breadcrumb}>
                <Button
                  label={t('lists.allPlaces')}
                  variant="quiet"
                  onPress={() => browseCountry()}
                />
                <AppText variant="heading" accessibilityRole="header">
                  {countryById.get(countryId)!.name}
                </AppText>
              </View>
            )}
            {scope === 'all' && <PlaceKindControl value={mode} onChange={(next) => {
              setMode(next);
              if (next === 'countries') setCountryId(undefined);
            }} />}
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder={t('lists.searchPlaces')}
              accessibilityLabel={t('lists.searchPlaces')}
            />
            <ChoiceControl
              value={scope}
              options={scopes}
              accessibilityLabel={t('countries.placesToShow')}
              onChange={changeScope}
            />
          </View>
        }
        ListEmptyComponent={!found.loading && !found.error ?
          <View style={styles.empty}>
            {scope === 'selected' && selected.size === 0 ? (
              <AppText tone="muted">{t('lists.noSelectedPlaces')}</AppText>
            ) : (
              <>
                <AppText>{t('lists.noPlacesFound')}</AppText>
                <AppText tone="muted">{t('lists.noPlacesFoundHint')}</AppText>
              </>
            )}
          </View> : null
        }
        onEndReached={found.loadMore}
        ListFooterComponent={<PlaceSearchFooter {...found} />}
        renderItem={({ item }) => (
          <PlaceRow
            place={item}
            selected={selected.has(item.id)}
            disabled={disabled}
            onToggle={toggle}
            onBrowseCountry={browseCountry}
          />
        )}
      />
    </Screen>
  );
}

const PlaceRow = memo(function PlaceRow({
  place,
  selected,
  disabled,
  onToggle,
  onBrowseCountry,
}: {
  place: Place;
  selected: boolean;
  disabled: boolean;
  onToggle: (id: string) => void;
  onBrowseCountry: (id: string) => void;
}) {
  return (
    <View style={[styles.card, selected && styles.selectedRow]}>
      <AppPressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        disabled={disabled}
        onPress={() => onToggle(place.id)}
        style={styles.row}
      >
        <View style={styles.name}>
          <AppText>{place.name}</AppText>
          {place.kind !== 'country' && (
            <AppText variant="caption" tone="muted">
              {getPlaceSubtitle(place)}
            </AppText>
          )}
        </View>
        <Checkmark checked={selected} />
      </AppPressable>
      {place.kind === 'country' && (
        <AppPressable
          style={styles.regions}
          accessibilityLabel={t('lists.exploreCountryPlaces', {
            country: place.name,
          })}
          onPress={() => onBrowseCountry(place.id)}
        >
          <AppText tone="accent" variant="caption" style={styles.name}>
            {t('lists.explorePlaces')}
          </AppText>
          <Icon name="chevronRight" color={theme.color.accent} />
        </AppPressable>
      )}
    </View>
  );
});

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: { paddingVertical: theme.space.md, paddingBottom: theme.space.xl },
  header: { gap: theme.space.md, paddingBottom: theme.space.lg },
  summary: { gap: theme.space.xs },
  breadcrumb: { alignItems: 'flex-start', gap: theme.space.xs },
  card: { borderRadius: theme.radius.sm, backgroundColor: theme.color.surface },
  row: {
    minHeight: theme.size.row,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.space.lg,
    gap: theme.space.lg,
  },
  regions: {
    minHeight: theme.size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    gap: theme.space.md,
    borderTopWidth: theme.stroke.subtle,
    borderTopColor: theme.color.border,
  },
  selectedRow: { backgroundColor: theme.color.selectedSurface },
  name: { flex: 1, gap: theme.space.xs },
  separator: { height: theme.space.xs },
  empty: { padding: theme.space.xl, gap: theme.space.sm },
});
