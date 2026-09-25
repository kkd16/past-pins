import { useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, StyleSheet, View } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { DataFeedback } from '../components/DataFeedback';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { SearchField } from '../components/SearchField';
import { Surface } from '../components/Surface';
import { ProgressSummary } from '../countries/ProgressSummary';
import type { Country } from '../countries/types';
import { useAppData } from '../data/AppDataProvider';
import { formatNumber, t } from '../localization';
import {
  getSubdivisionStatistics,
  searchSubdivisionCountries,
  subdivisionCountries,
} from '../subdivisions/tracking';
import { theme } from '../theme';

export function SubdivisionCountriesScreen({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const app = useAppData();
  const [query, setQuery] = useState('');
  const list = useRef<FlatList<Country>>(null);
  const matches = useMemo(() => searchSubdivisionCountries(query), [query]);
  const stats = useMemo(
    () => getSubdivisionStatistics(app.data.subdivisions),
    [app.data.subdivisions],
  );
  return (
    <Screen>
      <FlatList
        ref={list}
        data={matches}
        extraData={{ statuses: app.data.subdivisions, status: app.status }}
        keyExtractor={(country) => country.id}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText tone="muted">{t('subdivisions.description')}</AppText>
            <DataFeedback />
            <Surface style={styles.summary}>
              <ProgressSummary
                kind="subdivisions"
                label={t('subdivisions.visited')}
                visited={stats.visited}
                total={stats.total}
                loading={app.status !== 'ready'}
              />
              <AppText variant="caption" tone="muted">
                {t('subdivisions.coverage', {
                  regions: formatNumber(stats.total),
                  countries: formatNumber(subdivisionCountries.length),
                })}
              </AppText>
            </Surface>
            <SearchField
              value={query}
              onChangeText={(value) => {
                setQuery(value);
                list.current?.scrollToOffset({ offset: 0, animated: false });
              }}
              placeholder={t('subdivisions.searchCountries')}
              accessibilityLabel={t('subdivisions.searchCountries')}
            />
          </View>
        }
        ListEmptyComponent={
          <AppText tone="muted" style={styles.empty}>
            {t('subdivisions.noCountriesHint')}
          </AppText>
        }
        ListFooterComponent={
          <AppText variant="caption" tone="muted" style={styles.footer}>
            {t('subdivisions.coverageNote')}
          </AppText>
        }
        renderItem={({ item }) => {
          const countryStats = getSubdivisionStatistics(
            app.data.subdivisions,
            item.id,
          );
          return (
            <AppPressable
              style={styles.row}
              accessibilityLabel={
                app.status === 'ready'
                  ? t('subdivisions.countryProgress', {
                      country: item.name,
                      visited: formatNumber(countryStats.visited),
                      total: formatNumber(countryStats.total),
                    })
                  : item.name
              }
              accessibilityHint={t('subdivisions.openCountry')}
              onPress={() => {
                Keyboard.dismiss();
                onSelect(item.id);
              }}
            >
              <View style={styles.label}>
                <AppText>{item.name}</AppText>
                <AppText variant="caption" tone="muted">
                  {app.status === 'ready'
                    ? t('subdivisions.progress', {
                        visited: formatNumber(countryStats.visited),
                        total: formatNumber(countryStats.total),
                      })
                    : t('subdivisions.count', {
                        count: countryStats.total,
                        amount: formatNumber(countryStats.total),
                      })}
                </AppText>
              </View>
              <Icon name="chevronRight" />
            </AppPressable>
          );
        }}
      />
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.space.xl },
  header: { gap: theme.space.lg, paddingVertical: theme.space.lg },
  summary: { paddingHorizontal: theme.space.lg, paddingBottom: theme.space.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    padding: theme.space.lg,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.sm,
  },
  label: { flex: 1, gap: theme.space.xs },
  separator: { height: theme.space.sm },
  empty: { padding: theme.space.xl, textAlign: 'center' },
  footer: { paddingVertical: theme.space.xl },
});
