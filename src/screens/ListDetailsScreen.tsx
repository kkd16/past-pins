import { Stack } from 'expo-router';
import { ActionSheetIOS, FlatList, StyleSheet, View } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { showStatusPicker } from '../countries/StatusPicker';
import { appData as app } from '../data/app-data';
import { useAppData } from '../data/AppData';
import { ListMap } from '../lists/ListMap';
import { getListStatistics } from '../lists/places';
import { formatPlaceName, type Place } from '../places/catalog';
import { PlaceRow } from '../places/PlaceRow';
import { getPlaceStatus } from '../data/model';
import { usePlaces } from '../places/usePlaces';
import { PlaceFeedback } from '../places/PlaceFeedback';
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
  onShare,
}: {
  id: string;
  onEdit: () => void;
  onBrowse: () => void;
  onOpenPlace: (place: Place) => void;
  onOpenRegions: (countryId: string) => void;
  onShare: () => void;
}) {
  const data = useAppData((snapshot) => snapshot.data);
  const dataStatus = useAppData((snapshot) => snapshot.status);
  const busy = useAppData((snapshot) => snapshot.busy);
  const list = data.lists.find((item) => item.id === id);
  const disabled = dataStatus !== 'ready' || busy;
  const guard = useActionGuard(list);

  function options() {
    if (!list || disabled) return;
    const isCurrent = guard();
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: list.name,
        options: [
          t('sharing.listAction'),
          t('lists.rename'),
          t('lists.delete'),
          t('common.cancel'),
        ],
        disabledButtonIndices: list.placeIds.length ? [] : [0],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 3,
        userInterfaceStyle: theme.appearance.colorScheme,
      },
      (index) => {
        if (!isCurrent()) return;
        if (index === 0) onShare();
        if (index === 1)
          promptListName((name) => app.renameList(id, name), isCurrent, list.name);
        if (index === 2 && app.deleteList(id)) onBrowse();
      },
    );
  }

  function changeStatus(place: Place) {
    const isCurrent = guard();
    showStatusPicker(formatPlaceName(place), (status) => {
      if (!isCurrent()) return;
      void app.setStatus([place.id], status, { preserveLived: false, isCurrent });
    });
  }

  const result = usePlaces(list?.placeIds ?? []);
  const places = result.places;
  const stats = list
    ? getListStatistics(list, data)
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
        extraData={{ data, disabled }}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View style={styles.header}>
            <DataFeedback />
            <PlaceFeedback loading={result.loading} error={result.error} onRetry={result.retry} />
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
          dataStatus === 'ready' && !result.loading && !result.error ? (
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
          const regions =
            item.kind === 'country' ? getCountrySubdivisions(item.id) : [];
          return (
            <View style={styles.card}>
              <PlaceRow
                place={item}
                status={getPlaceStatus(data, item.id)}
                disabled={disabled}
                onPress={onOpenPlace}
                onChangeStatus={changeStatus}
              />
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
  grow: { flex: 1, gap: theme.space.xs },
  separator: { height: theme.space.sm },
});
