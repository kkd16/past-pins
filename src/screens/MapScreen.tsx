import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Surface } from '../components/Surface';
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
  const ready = visits.status === 'ready';

  return (
    <View style={styles.screen}>
      <GlobeViewport visitedIds={visits.visitedIds} onSelect={onSelect} />
      <SafeAreaView
        style={styles.overlay}
        pointerEvents="box-none"
        edges={{ top: true, bottom: true, left: true, right: true }}
      >
        <View style={styles.footer} pointerEvents="box-none">
          <VisitsFeedback {...visits} />
          {ready &&
            (visits.visitedIds.size === 0 ? (
              <Surface variant="floating" style={styles.invitation}>
                <AppText variant="heading" style={styles.invitationText}>
                  Your world starts here.
                </AppText>
                <AppText
                  variant="caption"
                  tone="muted"
                  style={styles.invitationText}
                >
                  Drag to explore. Tap a place you’ve been.
                </AppText>
                <Button
                  label="Mark your first visit"
                  onPress={onOpenCountries}
                />
              </Surface>
            ) : (
              <Surface
                variant="floating"
                style={styles.summary}
                pointerEvents="none"
                accessible
                accessibilityLabel={`World globe. ${visits.visitedIds.size} places visited. Use the Countries tab to browse and edit visits.`}
              >
                <AppText variant="number" tone="visited">
                  {visits.visitedIds.size}
                </AppText>
                <View style={styles.summaryText}>
                  <AppText variant="label">Places visited</AppText>
                  <AppText variant="caption" tone="muted">
                    Drag to spin · Pinch & twist to explore
                  </AppText>
                </View>
              </Surface>
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
    maxWidth: theme.size.contentMax,
    alignSelf: 'center',
  },
  invitation: {
    padding: theme.space.lg,
    gap: theme.space.md,
    alignItems: 'center',
  },
  invitationText: { textAlign: 'center' },
  summary: {
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.space.lg,
  },
  summaryText: { flexBasis: 180, flexGrow: 1, gap: theme.space.xs },
});
