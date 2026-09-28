import { useMemo, useState } from 'react';
import { FlatList, Keyboard, StyleSheet, View } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchField } from '../components/SearchField';
import { normalizeSearch } from '../countries/search';
import { appData as app } from '../data/app-data';
import { useAppData } from '../data/AppData';
import { getListStatistics } from '../lists/places';
import { formatPlaceName } from '../places/catalog';
import { usePlaces } from '../places/usePlaces';
import { PlaceFeedback } from '../places/PlaceFeedback';
import { promptListName } from '../lists/prompt';
import { useActionGuard } from '../navigation/useActionGuard';
import { compareNames, formatList, formatNumber, t } from '../localization';
import { theme } from '../theme';

export function ListsScreen({
  onOpen,
  onCreate,
}: {
  onOpen: (id: string) => void;
  onCreate: (id: string) => void;
}) {
  const data = useAppData((snapshot) => snapshot.data);
  const dataStatus = useAppData((snapshot) => snapshot.status);
  const busy = useAppData((snapshot) => snapshot.busy);
  const guard = useActionGuard(data.lists);
  const [query, setQuery] = useState('');
  const disabled = dataStatus !== 'ready' || busy;
  const term = normalizeSearch(query);
  const matches = data.lists
    .filter((list) => normalizeSearch(list.name).includes(term))
    .sort((a, b) => compareNames(a.name, b.name));

  const previewIds = useMemo(() => [...new Set(data.lists.flatMap((list) => list.placeIds.slice(0, 3)))], [data.lists]);
  const previews = usePlaces(previewIds);
  const previewById = useMemo(() => new Map(previews.places.map((place) => [place.id, place])), [previews.places]);

  function create() {
    Keyboard.dismiss();
    promptListName((name) => {
      const id = app.createList(name);
      if (id) onCreate(id);
    }, guard());
  }

  return (
    <Screen>
      <FlatList
        data={dataStatus === 'ready' ? matches : []}
        extraData={{ data, previewById }}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader
              title={t('lists.title')}
              subtitle={t('lists.subtitle')}
            >
              <Button
                label={t('lists.newList')}
                disabled={disabled}
                onPress={create}
              />
            </ScreenHeader>
            <DataFeedback />
            <PlaceFeedback loading={previews.loading} error={previews.error} onRetry={previews.retry} />
            {data.lists.length > 0 && (
              <SearchField
                value={query}
                onChangeText={setQuery}
                placeholder={t('lists.searchLists')}
                accessibilityLabel={t('lists.searchLists')}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          dataStatus === 'ready' ? (
            <View style={styles.empty}>
              <AppText variant="heading">
                {t(
                  data.lists.length
                    ? 'lists.noListsFound'
                    : 'lists.emptyTitle',
                )}
              </AppText>
              <AppText tone="muted">
                {t(
                  data.lists.length
                    ? 'lists.noListsFoundHint'
                    : 'lists.emptyHint',
                )}
              </AppText>
            </View>
          ) : null
        }
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => {
          const stats = getListStatistics(item, data);
          const counts = {
            visited: formatNumber(stats.visited),
            total: formatNumber(stats.total),
          };
          const preview = item.placeIds
            .slice(0, 3)
            .flatMap((id) => { const place = previewById.get(id); return place ? [formatPlaceName(place)] : []; });
          return (
            <AppPressable
              style={styles.card}
              accessibilityLabel={t('lists.listSummary', {
                name: item.name,
                ...counts,
              })}
              onPress={() => {
                Keyboard.dismiss();
                onOpen(item.id);
              }}
            >
              <View style={styles.cardBody}>
                <View style={styles.heading}>
                  <AppText variant="heading" style={styles.grow}>
                    {item.name}
                  </AppText>
                  <Icon name="chevronRight" />
                </View>
                {preview.length > 0 && (
                  <AppText tone="muted" numberOfLines={2}>
                    {formatList(preview)}
                  </AppText>
                )}
              </View>
              <View style={styles.progress}>
                <AppText variant="caption" tone="accent">
                  {t('lists.progress', counts)}
                </AppText>
                <View style={styles.track} accessibilityElementsHidden>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${stats.total ? (stats.visited / stats.total) * 100 : 0}%`,
                      },
                    ]}
                  />
                </View>
              </View>
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
  header: {
    paddingTop: theme.space.sm,
    gap: theme.space.md,
    paddingBottom: theme.space.lg,
  },
  card: {
    ...theme.surface.panel,
    backgroundColor: theme.color.surfaceWarm,
    overflow: 'hidden',
  },
  cardBody: {
    padding: theme.space.lg,
    gap: theme.space.md,
  },
  progress: {
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    gap: theme.space.sm,
    backgroundColor: theme.color.surface,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  grow: { flex: 1 },
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
  separator: { height: theme.space.md },
  empty: { paddingVertical: theme.space.xl, gap: theme.space.md },
});
