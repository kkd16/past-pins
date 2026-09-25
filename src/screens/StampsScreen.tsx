import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { SearchField } from '../components/SearchField';
import { Screen } from '../components/Screen';
import { getTravelStatistics } from '../countries/statistics';
import type { Country } from '../countries/types';
import { useAppData } from '../data/AppDataProvider';
import { isVisited } from '../data/model';
import { formatNumber, t } from '../localization';
import { CountryStamp } from '../stamps/CountryStamp';
import { selectStampCountries, type StampScope } from '../stamps/collection';
import { theme } from '../theme';

const scopes: readonly StampScope[] = ['collected', 'all', 'remaining'];

export function StampsScreen({
  onSelect,
  onBrowseCountries,
}: {
  onSelect: (countryId: string) => void;
  onBrowseCountries: () => void;
}) {
  const app = useAppData();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<StampScope>('collected');
  const list = useRef<FlatList<Country>>(null);
  const stats = useMemo(
    () => getTravelStatistics(app.data.places),
    [app.data.places],
  );
  const matches = useMemo(
    () => selectStampCountries(app.data.places, query, scope),
    [app.data.places, query, scope],
  );
  const columns =
    fontScale > theme.accessibility.largeTextScale || width < 280
      ? 1
      : width >= 660
        ? 4
        : width >= 500
          ? 3
          : 2;
  const itemWidth = (width - theme.space.lg * (columns - 1)) / columns;
  const startCollection =
    !query.trim() && scope === 'collected' && stats.visited === 0;
  const complete =
    !query.trim() && scope === 'remaining' && stats.remaining === 0;
  const emptyMessage = startCollection
    ? { title: t('stamps.emptyTitle'), hint: t('stamps.emptyHint') }
    : complete
      ? { title: t('stamps.completeTitle'), hint: t('stamps.completeHint') }
      : { title: t('stamps.noResults'), hint: t('stamps.noResultsHint') };

  function resetScroll() {
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }

  return (
    <Screen>
      <View
        style={styles.container}
        onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
      >
        {width > 0 && (
          <FlatList
            ref={list}
            key={columns}
            numColumns={columns}
            data={app.status === 'ready' ? matches : []}
            extraData={app.data.places}
            keyExtractor={(country) => country.id}
            contentInsetAdjustmentBehavior="never"
            contentContainerStyle={styles.content}
            columnWrapperStyle={columns > 1 ? styles.columns : undefined}
            automaticallyAdjustKeyboardInsets
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            initialNumToRender={8}
            ItemSeparatorComponent={Separator}
            ListHeaderComponent={
              <View style={styles.header}>
                <AppText tone="muted">{t('stamps.description')}</AppText>
                <DataFeedback />
                {app.status === 'ready' && (
                  <View style={styles.progress}>
                    <AppText variant="heading">
                      {t('stamps.progress', {
                        collected: formatNumber(stats.visited),
                        total: formatNumber(stats.total),
                      })}
                    </AppText>
                    <View style={styles.track} accessibilityElementsHidden>
                      <View
                        style={[
                          styles.fill,
                          { width: `${stats.visitedRatio * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                )}
                <SearchField
                  value={query}
                  onChangeText={(value) => {
                    setQuery(value);
                    resetScroll();
                  }}
                  placeholder={t('stamps.search')}
                  accessibilityLabel={t('stamps.search')}
                />
                <View
                  style={styles.scopes}
                  accessibilityRole="tablist"
                  accessibilityLabel={t('stamps.scopesLabel')}
                >
                  {scopes.map((option) => (
                    <AppPressable
                      key={option}
                      style={[
                        styles.scope,
                        scope === option && styles.selectedScope,
                      ]}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: scope === option }}
                      onPress={() => {
                        Keyboard.dismiss();
                        setScope(option);
                        resetScroll();
                      }}
                    >
                      <AppText
                        variant="label"
                        tone={scope === option ? 'accent' : 'muted'}
                      >
                        {t(`stamps.scopes.${option}`)}
                      </AppText>
                    </AppPressable>
                  ))}
                </View>
              </View>
            }
            ListEmptyComponent={
              app.status === 'ready' ? (
                <View style={styles.empty}>
                  <AppText variant="heading">{emptyMessage.title}</AppText>
                  <AppText tone="muted">{emptyMessage.hint}</AppText>
                  {startCollection && (
                    <Button
                      label={t('stamps.browseCountries')}
                      style={styles.browse}
                      onPress={() => {
                        Keyboard.dismiss();
                        onBrowseCountries();
                      }}
                    />
                  )}
                </View>
              ) : null
            }
            ListFooterComponent={
              <AppText variant="caption" tone="muted" style={styles.footer}>
                {t('stamps.coverage')}
              </AppText>
            }
            renderItem={({ item }) => {
              const collected = isVisited(app.data.places[item.id]);
              const status = t(
                collected ? 'stamps.collected' : 'stamps.notCollected',
              );
              return (
                <AppPressable
                  style={[styles.stamp, { width: itemWidth }]}
                  accessibilityLabel={t('stamps.stampLabel', {
                    country: item.name,
                    status,
                  })}
                  accessibilityHint={t('stamps.openStamp')}
                  onPress={() => {
                    Keyboard.dismiss();
                    onSelect(item.id);
                  }}
                >
                  <CountryStamp
                    country={item}
                    collected={collected}
                    size={Math.min(itemWidth, 232)}
                  />
                  <View style={styles.label}>
                    <AppText variant="label">{item.name}</AppText>
                    <AppText variant="caption" tone="muted">
                      {item.continent.name}
                    </AppText>
                    <AppText
                      variant="caption"
                      tone={collected ? 'accent' : 'muted'}
                    >
                      {status}
                    </AppText>
                  </View>
                </AppPressable>
              );
            }}
          />
        )}
      </View>
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: theme.space.xl },
  header: { gap: theme.space.lg, paddingVertical: theme.space.lg },
  progress: { gap: theme.space.md },
  track: {
    height: theme.size.progress,
    backgroundColor: theme.color.border,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: theme.color.visited,
    borderRadius: theme.radius.pill,
  },
  scopes: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.xs },
  scope: {
    maxWidth: '100%',
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
  },
  selectedScope: { backgroundColor: theme.color.selectedSurface },
  columns: { gap: theme.space.lg },
  stamp: { gap: theme.space.md, alignItems: 'center' },
  label: { gap: theme.space.xs, alignSelf: 'stretch' },
  separator: { height: theme.space.xl },
  footer: { paddingTop: theme.space.xl },
  empty: { gap: theme.space.md, paddingVertical: theme.space.xl },
  browse: { alignSelf: 'flex-start', marginTop: theme.space.sm },
});
