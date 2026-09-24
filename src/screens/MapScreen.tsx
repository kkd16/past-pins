import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import type { CountryId } from '../countries/types';
import { VisitsFeedback } from '../countries/VisitsFeedback';
import { useVisits } from '../countries/VisitsProvider';
import { WorldMapViewport } from '../countries/WorldMapViewport';
import { theme } from '../theme';

export function MapScreen({
  onSelect,
  onOpenCountries,
}: {
  onSelect: (id: CountryId) => void;
  onOpenCountries: () => void;
}) {
  const visits = useVisits();
  const [selectedId, setSelectedId] = useState<CountryId | null>(null);
  useFocusEffect(
    useCallback(() => {
      setSelectedId(null);
    }, []),
  );
  const select = useCallback(
    (id: CountryId) => {
      setSelectedId(id);
      onSelect(id);
    },
    [onSelect],
  );
  const ready = visits.status === 'ready';

  return (
    <SafeAreaView
      style={styles.screen}
      edges={{ top: true, bottom: true, left: true, right: true }}
    >
      <View style={styles.canvas}>
        <WorldMapViewport
          visitedIds={visits.visitedIds}
          selectedId={selectedId}
          onSelect={select}
        />
        <View style={styles.footer} pointerEvents="box-none">
          <VisitsFeedback {...visits} />
          {ready &&
            (visits.visitedIds.size === 0 ? (
              <View style={styles.invitation}>
                <AppText variant="heading">Your world starts here.</AppText>
                <AppText variant="caption" tone="muted">
                  Tap a place, or find it in Countries.
                </AppText>
                <Button
                  label="Mark your first visit"
                  variant="quiet"
                  onPress={onOpenCountries}
                />
              </View>
            ) : (
              <View
                accessible
                accessibilityLabel={`World map. ${visits.visitedIds.size} places visited. Use the Countries tab to browse and edit visits.`}
              >
                <AppText variant="caption" tone="muted" style={styles.hint}>
                  {visits.visitedIds.size} places visited · Pinch to explore
                </AppText>
              </View>
            ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.background },
  canvas: { flex: 1 },
  footer: {
    position: 'absolute',
    bottom: theme.space.md,
    left: theme.space.lg,
    right: theme.space.lg,
  },
  invitation: { gap: theme.space.sm, alignItems: 'center' },
  hint: { textAlign: 'center' },
});
