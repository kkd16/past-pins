import { useRef, useState } from 'react';
import { FlatList, Keyboard, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { Screen } from '../components/Screen';
import { SheetHeader } from '../components/SheetHeader';
import { SearchField } from '../components/SearchField';
import type { Place } from '../places/catalog';
import { PlaceRow } from '../places/PlaceRow';
import { getPlaceStatus } from '../data/model';
import { useAppData } from '../data/AppData';
import { usePlaceSearch } from '../places/usePlaceSearch';
import { PlaceSearchFooter } from '../places/PlaceFeedback';
import { PlaceSuggestions } from '../places/PlaceSuggestions';
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
  const data = useAppData((snapshot) => snapshot.data);
  const status = useAppData((snapshot) => snapshot.status);
  const busy = useAppData((snapshot) => snapshot.busy);
  const ready = status === 'ready';
  const disabled = busy || !ready;
  const results = usePlaceSearch({ query, scope: countriesOnly ? 'country' : 'all' });
  const searchLabel = t(
    countriesOnly ? 'countries.search' : 'places.searchAll',
  );
  const renderPlace = (place: Place) => <PlaceRow place={place} status={getPlaceStatus(data, place.id)}
    home={data.homeCountryId === place.id} disabled={disabled}
    onPress={(selected) => { Keyboard.dismiss(); onSelect(selected.id); }} />;
  return (
    <Screen onAccessibilityEscape={onCancel}>
      <View style={styles.header}>
        {onCancel && (
          <SheetHeader title={title} onDismiss={() => { Keyboard.dismiss(); onCancel(); }} />
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
        data={ready ? results.places : []}
        extraData={{ data, disabled }}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <PlaceSuggestions places={ready ? results.suggestions : []} renderPlace={renderPlace} />
            {onClear && (
              <Button
                label={t('countries.details.clearHome')}
                variant="quiet"
                onPress={() => {
                  Keyboard.dismiss();
                  onClear();
                }}
                disabled={disabled}
              />
            )}
          </>
        }
        ListEmptyComponent={
          ready && !results.loading && !results.error && !results.suggestions.length ? (
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
          ) : null
        }
        onEndReached={results.loadMore}
        ListFooterComponent={<PlaceSearchFooter {...results} />}
        renderItem={({ item }) => renderPlace(item)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: theme.space.md },
  list: { paddingVertical: theme.space.md },
  empty: { padding: theme.space.xl, alignItems: 'center', gap: theme.space.sm },
});
