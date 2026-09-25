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
import { Screen } from '../components/Screen';
import { SearchField } from '../components/SearchField';
import { useAppData } from '../data/AppDataProvider';
import type { TravelList } from '../data/model';
import { searchListPlaces, type ListPlace } from '../lists/places';
import { formatNumber, language, t } from '../localization';
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
  const [scope, setScope] = useState<ListPlace['kind'] | 'selected'>(
    originalPlaces.length > 0 ? 'selected' : 'country',
  );
  const results = useRef<FlatList<ListPlace>>(null);
  const exited = useRef(false);
  const stale = list.placeIds !== originalPlaces;
  const disabled = stale || app.busy || app.status !== 'ready';
  const changed =
    selected.size !== originalPlaces.length ||
    originalPlaces.some((placeId) => !selected.has(placeId));
  const scopes = [
    { value: 'country', label: t('lists.countries') },
    { value: 'region', label: t('lists.regions') },
    { value: 'selected', label: t('lists.selected') },
  ] as const;
  const searchScope = scope === 'selected' ? selected : scope;
  const matches = useMemo(
    () => searchListPlaces(query, searchScope),
    [query, searchScope],
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
    results.current?.scrollToOffset({ offset: 0, animated: false });
  }

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
}: {
  place: ListPlace;
  selected: boolean;
  disabled: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <AppPressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      disabled={disabled}
      onPress={() => onToggle(place.id)}
      style={[styles.row, selected && styles.selectedRow]}
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
  );
});

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: { paddingVertical: theme.space.md, paddingBottom: theme.space.xl },
  header: { gap: theme.space.md, paddingBottom: theme.space.lg },
  segments: { height: theme.size.touch },
  row: {
    minHeight: theme.size.row,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.space.lg,
    gap: theme.space.lg,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.surface,
  },
  selectedRow: { backgroundColor: theme.color.selectedSurface },
  name: { flex: 1, gap: theme.space.xs },
  separator: { height: theme.space.xs },
  empty: { padding: theme.space.xl, gap: theme.space.sm },
});
