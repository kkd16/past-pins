import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { theme } from '../theme';
import { CountryRow } from './CountryRow';
import type { CountrySection } from './filters';
import type { Country, CountryId } from './types';

export function CountryList({
  header,
  sections,
  resultCount,
  visitedIds,
  ready,
  onVisitedChange,
  onSelect,
  onReset,
  scrollResetKey,
}: {
  header: ReactNode;
  sections: CountrySection[];
  resultCount: number;
  visitedIds: ReadonlySet<CountryId>;
  ready: boolean;
  onVisitedChange: (id: CountryId, visited: boolean) => void;
  onSelect: (id: CountryId) => void;
  onReset: () => void;
  scrollResetKey: string;
}) {
  const list = useRef<SectionList<Country, CountrySection>>(null);
  // Reset for filter changes, but keep position while typing or editing visits.
  useLayoutEffect(() => {
    list.current?.getScrollResponder()?.scrollTo({ y: 0, animated: false });
  }, [scrollResetKey]);
  return (
    <SectionList<Country, CountrySection>
      ref={list}
      style={styles.list}
      sections={ready ? sections : []}
      extraData={visitedIds}
      keyExtractor={(country) => country.id}
      stickySectionHeadersEnabled
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={styles.content}
      renderItem={({ item }) => (
        <CountryRow
          country={item}
          visited={visitedIds.has(item.id)}
          disabled={!ready}
          onVisitedChange={onVisitedChange}
          onSelect={onSelect}
        />
      )}
      renderSectionHeader={({ section }) => (
        <View style={styles.section}>
          <AppText
            variant="label"
            tone="muted"
            accessibilityRole="header"
            style={styles.label}
          >
            {section.title}
          </AppText>
          <AppText variant="caption" tone="muted">
            {section.data.length}
          </AppText>
        </View>
      )}
      ListHeaderComponent={
        <>
          {header}
          {ready && (
            <AppText variant="caption" tone="muted" style={styles.count}>
              {resultCount} places
            </AppText>
          )}
        </>
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        ready ? (
          <View style={styles.empty}>
            <AppText variant="heading">No places found</AppText>
            <AppText tone="muted" style={styles.emptyText}>
              Try another name or change your filters.
            </AppText>
            <Button
              label="Reset search and filters"
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
  count: { paddingHorizontal: theme.space.lg, paddingVertical: theme.space.sm },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    backgroundColor: theme.color.background,
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.sm,
  },
  label: { flex: 1 },
  separator: { height: theme.space.xs },
  empty: { alignItems: 'center', padding: theme.space.xl, gap: theme.space.md },
  emptyText: { textAlign: 'center' },
});
