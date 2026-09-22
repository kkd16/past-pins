import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { theme } from '../theme';
import { countryById } from './catalog';
import type { CountryId } from './types';
import { WorldMapViewport } from './WorldMapViewport';

export function WorldMap({
  visitedIds,
  selectedId,
  onSelect,
  onVisitedChange,
  disabled,
  compact,
}: {
  visitedIds: ReadonlySet<CountryId>;
  selectedId: CountryId | null;
  onSelect: (id: CountryId | null) => void;
  onVisitedChange: (id: CountryId, visited: boolean) => void;
  disabled: boolean;
  compact: boolean;
}) {
  const selected = selectedId ? countryById.get(selectedId) : undefined;
  const selectedVisited = !!selectedId && visitedIds.has(selectedId);

  return (
    <View style={styles.card}>
      <WorldMapViewport
        visitedIds={visitedIds}
        selectedId={selectedId}
        onSelect={onSelect}
        compact={compact}
      />
      {!compact &&
        (selected ? (
          <View style={styles.callout}>
            <AppText variant="label" style={styles.countryName}>
              {selected.name}
            </AppText>
            <Button
              label={selectedVisited ? 'Remove visit' : 'Mark visited'}
              variant={selectedVisited ? 'quiet' : 'primary'}
              disabled={disabled}
              onPress={() => onVisitedChange(selected.id, !selectedVisited)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close country details"
              onPress={() => onSelect(null)}
              style={styles.close}
            >
              <Icon name="close" size={16} />
            </Pressable>
          </View>
        ) : (
          <View
            style={styles.hint}
            accessible
            accessibilityLabel={`World map. ${visitedIds.size} places visited. Use the checklist below to mark places.`}
          >
            <View style={styles.dot} />
            <AppText variant="caption" tone="muted">
              Pinch to explore · Tap a place
            </AppText>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.lg,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.accent,
  },
  callout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.space.xs,
    paddingLeft: theme.space.lg,
    paddingRight: theme.space.xs,
    paddingVertical: theme.space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: theme.color.border,
  },
  countryName: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 100,
    marginRight: theme.space.sm,
  },
  close: {
    minWidth: theme.size.touch,
    minHeight: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
