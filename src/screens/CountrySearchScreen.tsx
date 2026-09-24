import { useRef, useState } from 'react';
import { FlatList, Keyboard, StyleSheet, View } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchField } from '../components/SearchField';
import { searchCountries } from '../countries/search';
import { getStatusPresentation } from '../countries/status';
import type { Country } from '../countries/types';
import { useAppData } from '../data/AppDataProvider';
import { theme } from '../theme';
import { t } from '../localization';

export function CountrySearchScreen({
  title,
  onSelect,
  onCancel,
  onClear,
}: {
  title: string;
  onSelect: (id: string) => void;
  onCancel?: () => void;
  onClear?: () => void;
}) {
  const [query, setQuery] = useState('');
  const list = useRef<FlatList<Country>>(null);
  const { data, status, busy } = useAppData();
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
          placeholder={t('countries.search')}
          accessibilityLabel={t('countries.searchLabel')}
        />
        <DataFeedback />
      </View>
      <FlatList
        ref={list}
        data={searchCountries(query)}
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
          <AppText tone="muted" style={styles.empty}>
            {t('countries.empty.noSearchResults')}
          </AppText>
        }
        renderItem={({ item }) => {
          const presentation = getStatusPresentation(
            data.places[item.id],
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
                name: item.name,
                status: presentation.label,
              })}
              style={styles.row}
            >
              <View style={styles.name}>
                <AppText>{item.name}</AppText>
                <AppText variant="caption" tone="muted">
                  {t('countries.countrySubtitle', {
                    continent: item.continent.name,
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
  empty: { padding: theme.space.xl, textAlign: 'center' },
});
