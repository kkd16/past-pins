import { useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, StyleSheet, View } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchField } from '../components/SearchField';
import { countryById } from '../countries/catalog';
import { getStatusPresentation } from '../countries/status';
import {
  formatPlaceName,
  getPlaceStatus,
  searchPlaces,
  type Place,
} from '../places/catalog';
import { useAppData } from '../data/AppDataProvider';
import { theme } from '../theme';
import { t } from '../localization';

export function PlaceSearchScreen({
  title,
  countriesOnly = false,
  onSelect,
  onCancel,
  onClear,
}: {
  title: string;
  countriesOnly?: boolean;
  onSelect: (id: string) => void;
  onCancel?: () => void;
  onClear?: () => void;
}) {
  const [query, setQuery] = useState('');
  const list = useRef<FlatList<Place>>(null);
  const { data, status, busy } = useAppData();
  const matches = useMemo(
    () => searchPlaces(query, countriesOnly ? 'country' : 'all'),
    [query, countriesOnly],
  );
  const searchLabel = t(
    countriesOnly ? 'countries.search' : 'places.searchAll',
  );
  return (
    <Screen onAccessibilityEscape={onCancel}>
      <View style={styles.header}>
        {onCancel && (
          <ScreenHeader title={title} compact>
            <Button
              label={t('common.cancel')}
              variant="quiet"
              onPress={() => {
                Keyboard.dismiss();
                onCancel();
              }}
            />
          </ScreenHeader>
        )}
        <SearchField
          autoFocus
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            list.current?.scrollToOffset({ offset: 0, animated: false });
          }}
          placeholder={searchLabel}
          accessibilityLabel={searchLabel}
        />
        <DataFeedback />
      </View>
      <FlatList
        ref={list}
        data={matches}
        extraData={{ data, status, busy }}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          onClear && (
            <Button
              label={t('countries.details.clearHome')}
              variant="quiet"
              onPress={() => {
                Keyboard.dismiss();
                onClear();
              }}
              disabled={busy || status !== 'ready'}
            />
          )
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText tone="muted">
              {t(
                countriesOnly
                  ? 'countries.empty.noSearchResults'
                  : 'places.noSearchResults',
              )}
            </AppText>
            {!countriesOnly && (
              <AppText tone="muted">{t('places.noSearchResultsHint')}</AppText>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const presentation = getStatusPresentation(
            getPlaceStatus(data, item),
            data.homeCountryId === item.id,
          );
          return (
            <AppPressable
              onPress={() => {
                Keyboard.dismiss();
                onSelect(item.id);
              }}
              disabled={busy || status !== 'ready'}
              accessibilityLabel={t('countries.countryStatus', {
                name: formatPlaceName(item),
                status: presentation.label,
              })}
              style={styles.row}
            >
              <View style={styles.name}>
                <AppText>{item.name}</AppText>
                <AppText variant="caption" tone="muted">
                  {t('countries.countrySubtitle', {
                    continent:
                      item.kind === 'region'
                        ? item.countryName
                        : countryById.get(item.id)!.continent.name,
                    status: presentation.label,
                  })}
                </AppText>
              </View>
              <Icon name={presentation.icon} color={presentation.color} />
            </AppPressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: theme.space.md },
  list: { paddingVertical: theme.space.md },
  row: {
    minHeight: theme.size.row,
    paddingVertical: theme.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  name: { flex: 1, gap: theme.space.xs },
  empty: { padding: theme.space.xl, alignItems: 'center', gap: theme.space.sm },
});
