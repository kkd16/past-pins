import { Link } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/ui/AppText';
import { theme } from '../../theme';
import { searchCountries } from './catalog';
import { CountryRow } from './CountryRow';
import type { CountryId } from './types';

export function CountryChecklist({
  query,
  visitedIds,
  disabled,
  onVisitedChange,
}: {
  query: string;
  visitedIds: ReadonlySet<CountryId>;
  disabled: boolean;
  onVisitedChange: (id: CountryId, visited: boolean) => void;
}) {
  const countries = useMemo(() => searchCountries(query), [query]);
  const insets = useSafeAreaInsets();
  return (
    <FlatList
      style={styles.list}
      data={countries}
      extraData={visitedIds}
      keyExtractor={(country) => country.id}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + theme.space.xl }}
      renderItem={({ item }) => (
        <CountryRow
          country={item}
          visited={visitedIds.has(item.id)}
          disabled={disabled}
          onVisitedChange={onVisitedChange}
        />
      )}
      ListHeaderComponent={
        <View style={styles.section}>
          <AppText variant="label" tone="muted" style={styles.sectionName}>
            {query.trim() ? 'Search results' : 'Countries & territories'}
          </AppText>
          <AppText variant="caption" tone="muted" style={styles.count}>
            {countries.length}
          </AppText>
        </View>
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <AppText variant="heading">No places found</AppText>
          <AppText tone="muted">Try another name or country code.</AppText>
        </View>
      }
      ListFooterComponent={
        countries.length ? (
          <View style={styles.credits}>
            <Link href="https://mapsvg.com/maps/world">
              <AppText variant="caption" tone="muted">
                Map data © MapSVG · CC BY 4.0
              </AppText>
            </Link>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.sm,
    backgroundColor: theme.color.background,
  },
  sectionName: { flex: 1 },
  count: { fontVariant: ['tabular-nums'] },
  separator: { height: theme.space.xs },
  empty: { padding: theme.space.xl, gap: theme.space.sm, alignItems: 'center' },
  credits: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.xl,
    gap: theme.space.md,
  },
});
