import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { Stack } from 'expo-router';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  I18nManager,
  Keyboard,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Checkmark } from '../components/Checkmark';
import { ChoiceRow } from '../components/ChoiceRow';
import { DataFeedback } from '../components/DataFeedback';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { SearchField } from '../components/SearchField';
import { countryById } from '../countries/catalog';
import { useAppData } from '../data/AppDataProvider';
import type { TravelList } from '../data/model';
import { formatNumber, language, t } from '../localization';
import { searchPlaces, type Place } from '../places/catalog';
import { getCountrySubdivisions } from '../subdivisions/catalog';
import { getCountrySubdivisionTerminology } from '../subdivisions/terminology';
import { theme } from '../theme';

type Props = {
  id: string;
  onDone: () => void;
  onCancel: () => void;
};

export function ListPlacesScreen(props: Props) {
  const app = useAppData();
  const list = app.data.lists.find(({ id }) => id === props.id);
  if (list && app.status === 'ready')
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
      {app.status === 'ready' && (
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
  const app = useAppData();
  const { fontScale } = useWindowDimensions();
  const [originalPlaces] = useState(list.placeIds);
  const [selected, setSelected] = useState(() => new Set(originalPlaces));
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'selected'>('all');
  const [countryId, setCountryId] = useState<string>();
  const results = useRef<FlatList<Place>>(null);
  const exited = useRef(false);
  const stale = list.placeIds !== originalPlaces;
  const disabled = stale || app.busy || app.status !== 'ready';
  const changed =
    selected.size !== originalPlaces.length ||
    originalPlaces.some((placeId) => !selected.has(placeId));
  const scopes = [
    { value: 'all', label: t('lists.allPlaces') },
    { value: 'selected', label: t('lists.selected') },
  ] as const;
  const searchScope =
    scope === 'selected' ? selected : countryId ? 'region' : 'all';
  const matches = useMemo(
    () => searchPlaces(query, searchScope, countryId),
    [query, searchScope, countryId],
  );

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
    results.current?.scrollToOffset({ offset: 0, animated: false });
  }

  const browseCountry = useCallback((nextCountryId?: string) => {
    setCountryId(nextCountryId);
    setQuery('');
    setScope('all');
    Keyboard.dismiss();
    results.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  function cancel() {
    if (exited.current) return;
    exited.current = true;
    Keyboard.dismiss();
    onCancel();
  }

  function save() {
    if (disabled || !changed || exited.current) return;
    if (app.setListPlaces(id, [...selected])) {
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
        data={matches}
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
            <AppText variant="heading" accessibilityRole="header">
              {list.name}
            </AppText>
            <AppText tone="muted">
              {t('lists.selectedCount', {
                count: selected.size,
                amount: formatNumber(selected.size),
              })}
            </AppText>
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
                  {t('subdivisions.countryTitle', {
                    ...getCountrySubdivisionTerminology(countryId),
                    country: countryById.get(countryId)!.name,
                  })}
                </AppText>
              </View>
            )}
            <SearchField
              value={query}
              onChangeText={(value) => {
                setQuery(value);
                results.current?.scrollToOffset({ offset: 0, animated: false });
              }}
              placeholder={t('lists.searchPlaces')}
              accessibilityLabel={t('lists.searchPlaces')}
            />
            {I18nManager.isRTL ||
            fontScale > theme.accessibility.largeTextScale ? (
              <View accessibilityRole="radiogroup">
                {scopes.map(({ value, label }) => (
                  <ChoiceRow
                    key={value}
                    label={label}
                    selected={scope === value}
                    onPress={() => changeScope(value)}
                  />
                ))}
              </View>
            ) : (
              <SegmentedControl
                values={scopes.map(({ label }) => label)}
                selectedIndex={scopes.findIndex(({ value }) => scope === value)}
                accessibilityLanguage={language}
                appearance={theme.appearance.colorScheme}
                tintColor={theme.color.accent}
                backgroundColor={theme.color.surface}
                fontStyle={{ color: theme.color.textMuted }}
                activeFontStyle={{ color: theme.color.onAccent }}
                onChange={({ nativeEvent }) =>
                  changeScope(scopes[nativeEvent.selectedSegmentIndex].value)
                }
                style={styles.segments}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {scope === 'selected' && selected.size === 0 ? (
              <AppText tone="muted">{t('lists.noSelectedPlaces')}</AppText>
            ) : (
              <>
                <AppText>{t('lists.noPlacesFound')}</AppText>
                <AppText tone="muted">{t('lists.noPlacesFoundHint')}</AppText>
              </>
            )}
          </View>
        }
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
  const regions =
    place.kind === 'country' ? getCountrySubdivisions(place.id) : [];
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
          {place.kind === 'region' && (
            <AppText variant="caption" tone="muted">
              {place.countryName}
            </AppText>
          )}
        </View>
        <Checkmark checked={selected} />
      </AppPressable>
      {regions.length > 0 && (
        <AppPressable
          style={styles.regions}
          accessibilityLabel={t('lists.exploreCountryRegions', {
            country: place.name,
          })}
          onPress={() => onBrowseCountry(place.id)}
        >
          <AppText tone="accent" variant="caption" style={styles.name}>
            {t('lists.exploreRegions', {
              count: regions.length,
              amount: formatNumber(regions.length),
            })}
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
  breadcrumb: { alignItems: 'flex-start', gap: theme.space.xs },
  segments: { height: theme.size.touch },
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
