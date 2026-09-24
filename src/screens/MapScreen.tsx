import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import type { CountryId } from '../countries/types';
import { VisitsFeedback } from '../countries/VisitsFeedback';
import { useVisits } from '../countries/VisitsProvider';
import { GlobeViewport } from '../globe/GlobeViewport';
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
    <View style={styles.screen}>
      <GlobeViewport
        visitedIds={visits.visitedIds}
        selectedId={selectedId}
        onSelect={select}
      />
      <SafeAreaView
        style={styles.overlay}
        pointerEvents="box-none"
        edges={{ top: true, bottom: true, left: true, right: true }}
      >
        <View style={styles.footer} pointerEvents="box-none">
          <VisitsFeedback {...visits} />
          {ready &&
            (visits.visitedIds.size === 0 ? (
              <View style={styles.invitation}>
                <AppText variant="heading">Your world starts here.</AppText>
                <AppText variant="caption" tone="muted">
                  Drag to spin, pinch to zoom, and tap a place.
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
                accessibilityLabel={`World globe. ${visits.visitedIds.size} places visited. Use the Countries tab to browse and edit visits.`}
              >
                <AppText variant="caption" tone="muted" style={styles.hint}>
                  {visits.visitedIds.size} places visited · Drag to spin, pinch
                  to zoom
                </AppText>
              </View>
            ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.background },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
  footer: {
    margin: theme.space.lg,
    padding: theme.space.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.background,
  },
  invitation: { gap: theme.space.sm, alignItems: 'center' },
  hint: { textAlign: 'center' },
});
