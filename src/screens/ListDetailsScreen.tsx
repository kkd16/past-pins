import { useMemo } from 'react';
import { Stack } from 'expo-router';
import { ActionSheetIOS, FlatList, StyleSheet, View } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { Icon } from '../components/Icon';
import { IconButton } from '../components/IconButton';
import { Screen } from '../components/Screen';
import { getStatusPresentation } from '../countries/status';
import { showStatusPicker } from '../countries/StatusPicker';
import { useAppData } from '../data/AppDataProvider';
import { ListMap } from '../lists/ListMap';
import {
  formatListPlaceName,
  getListPlace,
  getListPlaceStatus,
  getListStatistics,
  type ListPlace,
} from '../lists/places';
import { promptListName } from '../lists/prompt';
import { useListActionGuard } from '../lists/useListActionGuard';
import { formatNumber, t } from '../localization';
import { theme } from '../theme';

export function ListDetailsScreen({
  id,
  onEdit,
  onBrowse,
  onOpenPlace,
}: {
  id: string;
  onEdit: () => void;
  onBrowse: () => void;
  onOpenPlace: (place: ListPlace) => void;
}) {
  const app = useAppData();
  const list = app.data.lists.find((item) => item.id === id);
  const disabled = app.status !== 'ready' || app.busy;
  const guard = useListActionGuard(app.data.lists);

  function options() {
    if (!list) return;
    const isCurrent = guard();
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: list.name,
        options: [t('lists.rename'), t('lists.delete'), t('common.cancel')],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
        userInterfaceStyle: theme.appearance.colorScheme,
      },
      (index) => {
        if (!isCurrent()) return;
        if (index === 0)
          promptListName((name) => {
            if (isCurrent()) app.renameList(id, name);
          }, list.name);
        if (index === 1 && app.deleteList(id)) onBrowse();
      },
    );
  }

  function changeStatus(place: ListPlace) {
    const isCurrent = guard();
    showStatusPicker(formatListPlaceName(place), (status) => {
      if (!isCurrent()) return;
      if (place.kind === 'country')
        void app.setStatus([place.id], status, { preserveLived: false });
      else
        void app.setSubdivisionStatus([place.id], status, {
          preserveLived: false,
        });
    });
  }

  const places = useMemo(
    () => list?.placeIds.map((placeId) => getListPlace(placeId)!) ?? [],
    [list?.placeIds],
  );
  const stats = list
    ? getListStatistics(list, app.data)
    : { visited: 0, total: 0 };
  return (
    <Screen>
      <Stack.Screen
        options={{
          title: t('lists.title'),
          headerRight: () =>
            list ? (
              <Button
                label={t('lists.options')}
                variant="quiet"
                disabled={disabled}
                onPress={options}
              />
            ) : null,
        }}
      />
      <FlatList
        data={places}
        extraData={{ data: app.data, disabled }}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View style={styles.header}>
            <DataFeedback />
            {list && (
              <>
                <AppText variant="title" accessibilityRole="header">
                  {list.name}
                </AppText>
                {places.length > 0 && (
                  <>
                    <ListMap places={places} />
                    <AppText variant="heading" tone="accent">
                      {t('lists.progress', {
                        visited: formatNumber(stats.visited),
                        total: formatNumber(stats.total),
                      })}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {t('lists.independent')}
                    </AppText>
                    <Button
                      label={t('lists.editPlaces')}
                      onPress={onEdit}
                      disabled={disabled}
                    />
                  </>
                )}
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          app.status === 'ready' ? (
            <View style={styles.empty}>
              <AppText variant="heading">
                {t(list ? 'lists.emptyListTitle' : 'lists.unavailable')}
              </AppText>
              {list && (
                <AppText tone="muted">{t('lists.emptyListHint')}</AppText>
              )}
              <Button
                label={t(list ? 'lists.addPlaces' : 'lists.browseLists')}
                disabled={list ? disabled : false}
                onPress={list ? onEdit : onBrowse}
              />
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const presentation = getStatusPresentation(
            getListPlaceStatus(app.data, item),
          );
          const name = formatListPlaceName(item);
          return (
            <View style={styles.row}>
              <AppPressable
                style={styles.place}
                accessibilityLabel={t('lists.placeStatus', {
                  name,
                  status: presentation.label,
                })}
                accessibilityHint={t('lists.openPlace')}
                onPress={() => onOpenPlace(item)}
              >
                <View style={styles.grow}>
                  <AppText>{item.name}</AppText>
                  {item.kind === 'region' && (
                    <AppText variant="caption" tone="muted">
                      {item.countryName}
                    </AppText>
                  )}
                  <AppText
                    variant="caption"
                    style={{ color: presentation.color }}
                  >
                    {presentation.label}
                  </AppText>
                </View>
                <Icon name="chevronRight" />
              </AppPressable>
              <IconButton
                name={presentation.icon}
                color={presentation.color}
                accessibilityLabel={t('lists.changePlaceStatus', { name })}
                disabled={disabled}
                onPress={() => changeStatus(item)}
              />
            </View>
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
    gap: theme.space.md,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.lg,
  },
  empty: { paddingVertical: theme.space.xl, gap: theme.space.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.sm,
    paddingEnd: theme.space.sm,
  },
  place: {
    flex: 1,
    padding: theme.space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  grow: { flex: 1, gap: theme.space.xs },
  separator: { height: theme.space.sm },
});
