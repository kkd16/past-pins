import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import type { AppData } from '../data/model';
import { theme } from '../theme';
import { t, formatNumber, language } from '../localization';
import { CountryRow } from './CountryRow';
import {
  getEmptyCountriesMessage,
  type CountryScope,
  type CountrySection,
} from './filters';
import type { Country, CountryId } from './types';

export function CountryList({
  header,
  sections,
  places,
  homeCountryId,
  ready,
  disabled,
  onChangeStatus,
  onSelect,
  onReset,
  scrollResetKey,
  scope,
  narrowed,
  selecting,
  selectedIds,
  onStartSelection,
}: {
  header: ReactNode;
  sections: CountrySection[];
  places: AppData['places'];
  homeCountryId: string | null;
  ready: boolean;
  disabled: boolean;
  onChangeStatus: (id: CountryId) => void;
  onSelect: (id: CountryId) => void;
  onReset: () => void;
  scrollResetKey: string;
  scope: CountryScope;
  narrowed: boolean;
  selecting: boolean;
  selectedIds: ReadonlySet<CountryId>;
  onStartSelection: () => void;
}) {
  const list = useRef<SectionList<Country, CountrySection>>(null);
  useLayoutEffect(() => {
    list.current?.getScrollResponder()?.scrollTo({ y: 0, animated: false });
  }, [scrollResetKey]);
  const empty = getEmptyCountriesMessage(scope, narrowed);
  const resultCount = sections.reduce(
    (count, section) => count + section.data.length,
    0,
  );
  return (
    <SectionList<Country, CountrySection>
      ref={list}
      style={styles.list}
      sections={ready ? sections : []}
      extraData={{ places, homeCountryId, disabled, selecting, selectedIds }}
      keyExtractor={(country) => country.id}
      stickySectionHeadersEnabled
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={styles.content}
      renderItem={({ item }) => (
        <CountryRow
          country={item}
          status={places[item.id] ?? 'unvisited'}
          home={homeCountryId === item.id}
          disabled={disabled}
          onChangeStatus={onChangeStatus}
          onSelect={onSelect}
          selecting={selecting}
          selected={selectedIds.has(item.id)}
        />
      )}
      renderSectionHeader={({ section }) => (
        <View
          accessible
          accessibilityRole="header"
          accessibilityLanguage={language}
          accessibilityLabel={t('countries.sectionLabel', {
            name: section.title,
            places: t('countries.placeCount', {
              count: section.data.length,
              amount: formatNumber(section.data.length),
            }),
          })}
          style={styles.section}
        >
          <AppText variant="heading" style={styles.label}>
            {section.title}
          </AppText>
          <AppText variant="caption" tone="muted">
            {formatNumber(section.data.length)}
          </AppText>
        </View>
      )}
      ListHeaderComponent={
        <>
          {header}
          {ready && (
            <View style={styles.results}>
              <AppText variant="caption" tone="muted" style={styles.resultCount}>
                {t('countries.placeCount', {
                  count: resultCount,
                  amount: formatNumber(resultCount),
                })}
              </AppText>
              {!selecting && (
                <Button
                  label={t('countries.select')}
                  variant="quiet"
                  disabled={disabled || resultCount === 0}
                  onPress={onStartSelection}
                />
              )}
            </View>
          )}
        </>
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        ready ? (
          <View style={styles.empty}>
            <AppText variant="heading" style={styles.emptyText}>
              {empty.title}
            </AppText>
            <AppText tone="muted" style={styles.emptyText}>
              {empty.message}
            </AppText>
            <Button
              label={
                narrowed
                  ? t('countries.empty.clearFilters')
                  : t('countries.empty.browse')
              }
              variant="quiet"
              onPress={onReset}
            />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { paddingBottom: theme.space.xl },
  results: {
    minHeight: theme.size.touch,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.space.md,
    paddingStart: theme.space.lg,
  },
  resultCount: { flexGrow: 1, flexBasis: 120 },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    backgroundColor: theme.color.background,
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.xl,
    paddingBottom: theme.space.sm,
  },
  label: { flex: 1 },
  separator: { height: theme.space.sm },
  empty: { alignItems: 'center', padding: theme.space.xl, gap: theme.space.md },
  emptyText: { textAlign: 'center' },
});
