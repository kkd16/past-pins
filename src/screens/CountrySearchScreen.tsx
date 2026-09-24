import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchField } from '../components/SearchField';
import { searchCountries } from '../countries/search';
import { getStatusPresentation } from '../countries/status';
import { useAppData } from '../data/AppDataProvider';
import { theme } from '../theme';

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
  const { data, status, busy } = useAppData();
  return (
    <Screen>
      {onCancel && (
        <ScreenHeader title={title} compact>
          <Button label="Cancel" variant="quiet" onPress={onCancel} />
        </ScreenHeader>
      )}
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Search countries"
        accessibilityLabel="Search countries"
      />
      <DataFeedback />
      <FlatList
        data={searchCountries(query)}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          onClear && (
            <Button
              label="Clear current home"
              variant="quiet"
              onPress={onClear}
              disabled={busy || status !== 'ready'}
            />
          )
        }
        ListEmptyComponent={
          <AppText tone="muted" style={styles.empty}>
            No countries found. Try another name.
          </AppText>
        }
        renderItem={({ item }) => {
          const presentation = getStatusPresentation(
            data.places[item.id],
            data.homeCountryId === item.id,
          );
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => onSelect(item.id)}
              disabled={busy || status !== 'ready'}
              accessibilityState={{ disabled: busy || status !== 'ready' }}
              accessibilityLabel={`${item.name}, ${presentation.label}`}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.name}>
                <AppText>{item.name}</AppText>
                <AppText variant="caption" tone="muted">
                  {item.continent.name} · {presentation.label}
                </AppText>
              </View>
              <Icon name={presentation.icon} color={presentation.color} />
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  pressed: { opacity: theme.opacity.pressed },
});
