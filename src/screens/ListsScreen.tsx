import { useState } from 'react';
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
import { useAppData } from '../data/AppDataProvider';
import { getListStatistics } from '../lists/places';
import { formatPlaceName, getPlace } from '../places/catalog';
import { promptListName } from '../lists/prompt';
import { useActionGuard } from '../navigation/useActionGuard';
import { compareNames, formatList, formatNumber, t } from '../localization';
import { theme } from '../theme';

export function ListsScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const app = useAppData();
  const guard = useActionGuard(app.data.lists);
  const [query, setQuery] = useState('');
  const disabled = app.status !== 'ready' || app.busy;
  const term = normalizeSearch(query);
  const matches = app.data.lists
    .filter((list) => normalizeSearch(list.name).includes(term))
    .sort((a, b) => compareNames(a.name, b.name));

  function create() {
    Keyboard.dismiss();
    const isCurrent = guard();
    promptListName((name) => {
      if (!isCurrent()) return;
      const id = app.createList(name);
      if (id) onOpen(id);
    });
  }

  return (
    <Screen>
      <FlatList
        data={app.status === 'ready' ? matches : []}
        extraData={app.data}
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
            {app.data.lists.length > 0 && (
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
          app.status === 'ready' ? (
            <View style={styles.empty}>
              <AppText variant="heading">
                {t(
                  app.data.lists.length
                    ? 'lists.noListsFound'
                    : 'lists.emptyTitle',
                )}
              </AppText>
              <AppText tone="muted">
                {t(
                  app.data.lists.length
                    ? 'lists.noListsFoundHint'
                    : 'lists.emptyHint',
                )}
              </AppText>
            </View>
          ) : null
        }
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => {
          const stats = getListStatistics(item, app.data);
          const counts = {
            visited: formatNumber(stats.visited),
            total: formatNumber(stats.total),
          };
          const preview = item.placeIds
            .slice(0, 3)
            .map((id) => formatPlaceName(getPlace(id)!));
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
    padding: theme.space.lg,
    gap: theme.space.md,
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
