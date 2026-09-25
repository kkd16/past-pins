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
import { getListStatistics } from '../lists/places';
import {
  formatPlaceName,
  getPlace,
  getPlaceStatus,
  type Place,
} from '../places/catalog';
import { promptListName } from '../lists/prompt';
import { useActionGuard } from '../navigation/useActionGuard';
import { formatNumber, t } from '../localization';
import { getCountrySubdivisions } from '../subdivisions/catalog';
import { theme } from '../theme';

export function ListDetailsScreen({
  id,
  onEdit,
  onBrowse,
  onOpenPlace,
  onOpenRegions,
}: {
  id: string;
  onEdit: () => void;
  onBrowse: () => void;
  onOpenPlace: (place: Place) => void;
  onOpenRegions: (countryId: string) => void;
}) {
  const app = useAppData();
  const list = app.data.lists.find((item) => item.id === id);
  const disabled = app.status !== 'ready' || app.busy;
  const guard = useActionGuard(app.data.lists);

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

  function changeStatus(place: Place) {
    const isCurrent = guard();
    showStatusPicker(formatPlaceName(place), (status) => {
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
    () => list?.placeIds.map((placeId) => getPlace(placeId)!) ?? [],
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
            getPlaceStatus(app.data, item),
          );
          const name = formatPlaceName(item);
          const regions =
            item.kind === 'country' ? getCountrySubdivisions(item.id) : [];
          return (
            <View style={styles.card}>
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
              {regions.length > 0 && (
                <AppPressable
                  style={styles.regions}
                  accessibilityLabel={t('lists.exploreCountryRegions', {
                    country: item.name,
                  })}
                  onPress={() => onOpenRegions(item.id)}
                >
                  <AppText variant="caption" tone="accent" style={styles.grow}>
                    {t('lists.exploreRegions', {
                      count: regions.length,
                      amount: formatNumber(regions.length),
                    })}
                  </AppText>
                  <Icon name="chevronRight" color={theme.color.accent} />
                </AppPressable>
              )}
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
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingEnd: theme.space.sm,
  },
  regions: {
    minHeight: theme.size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    borderTopWidth: theme.stroke.subtle,
    borderTopColor: theme.color.border,
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
