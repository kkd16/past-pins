import { Stack } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Checkmark } from '../components/Checkmark';
import { DataFeedback } from '../components/DataFeedback';
import { Screen } from '../components/Screen';
import { useAppData } from '../data/AppDataProvider';
import { formatPlaceName, getPlace } from '../places/catalog';
import { promptListName } from '../lists/prompt';
import { useActionGuard } from '../navigation/useActionGuard';
import { compareNames, formatNumber, t } from '../localization';
import { theme } from '../theme';

export function PlaceListsScreen({
  placeId,
  onDone,
}: {
  placeId: string;
  onDone: () => void;
}) {
  const app = useAppData();
  const guard = useActionGuard(app.data.lists);
  const place = getPlace(placeId);
  const disabled = app.status !== 'ready' || app.busy || !place;
  const lists = [...app.data.lists].sort((a, b) =>
    compareNames(a.name, b.name),
  );
  return (
    <Screen onAccessibilityEscape={onDone}>
      <Stack.Screen
        options={{
          title: t('lists.saveToLists'),
          headerRight: () => (
            <Button label={t('common.done')} variant="quiet" onPress={onDone} />
          ),
        }}
      />
      <FlatList
        data={place ? lists : []}
        extraData={disabled}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <DataFeedback />
            <AppText tone="muted">
              {place
                ? t('lists.membershipHint', {
                    name: formatPlaceName(place),
                  })
                : t('lists.placeUnavailable')}
            </AppText>
            <Button
              label={t('lists.newList')}
              disabled={disabled}
              onPress={() => {
                const isCurrent = guard();
                promptListName((name) => {
                  if (isCurrent()) app.createList(name, [placeId]);
                });
              }}
            />
          </View>
        }
        ListEmptyComponent={
          app.status === 'ready' && place ? (
            <AppText tone="muted">{t('lists.membershipEmpty')}</AppText>
          ) : null
        }
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => {
          const selected = item.placeIds.includes(placeId);
          return (
            <AppPressable
              style={styles.row}
              disabled={disabled}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={item.name}
              onPress={() => app.toggleListPlace(item.id, placeId)}
            >
              <View style={styles.grow}>
                <AppText variant="heading">{item.name}</AppText>
                <AppText variant="caption" tone="muted">
                  {t('lists.count', {
                    count: item.placeIds.length,
                    amount: formatNumber(item.placeIds.length),
                  })}
                </AppText>
              </View>
              <Checkmark checked={selected} />
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
  header: { paddingVertical: theme.space.lg, gap: theme.space.lg },
  row: {
    ...theme.surface.panel,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.space.lg,
    gap: theme.space.md,
  },
  grow: { flex: 1, gap: theme.space.xs },
  separator: { height: theme.space.sm },
});
