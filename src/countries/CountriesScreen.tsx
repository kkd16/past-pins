import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Keyboard, StyleSheet } from 'react-native';

import { Screen } from '../components/Screen';
import { AppText } from '../components/AppText';
import { SearchField } from '../components/SearchField';
import { useKeyboardVisible } from '../hooks/useKeyboardVisible';
import { theme } from '../theme';
import { CountriesHeader } from './CountriesHeader';
import { CountryChecklist } from './CountryChecklist';
import { ProgressSummary } from './ProgressSummary';
import { VisitsFeedback } from './VisitsFeedback';
import { WorldMap } from './WorldMap';
import { countries } from './catalog';
import type { VisitStorage } from './visit-storage';
import { useVisitedCountries } from '../hooks/useVisitedCountries';
import type { CountryId } from './types';

export function CountriesScreen({ storage }: { storage: VisitStorage }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<CountryId | null>(null);
  const keyboardVisible = useKeyboardVisible();
  const visits = useVisitedCountries(storage);
  const ready = visits.status === 'ready';

  const { setVisited } = visits;
  const onVisitedChange = useCallback(
    (id: CountryId, visited: boolean) => {
      setVisited(id, visited);
      Haptics.selectionAsync().catch((error: unknown) =>
        console.warn('Selection haptic unavailable.', error),
      );
    },
    [setVisited],
  );

  return (
    <Screen>
      {!keyboardVisible && <CountriesHeader />}
      <WorldMap
        visitedIds={visits.visitedIds}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onVisitedChange={onVisitedChange}
        disabled={!ready}
        compact={keyboardVisible}
      />
      <ProgressSummary
        visited={visits.visitedIds.size}
        total={countries.length}
        loading={!ready}
      />
      <VisitsFeedback {...visits} />
      {ready && visits.visitedIds.size === 0 && !keyboardVisible && (
        <AppText variant="caption" tone="muted" style={styles.invitation}>
          Check a place you’ve been. Make this world yours.
        </AppText>
      )}
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Find a country or territory"
        accessibilityLabel="Search countries and territories"
        onSubmitEditing={Keyboard.dismiss}
      />
      <CountryChecklist
        query={query}
        visitedIds={visits.visitedIds}
        disabled={!ready}
        onVisitedChange={onVisitedChange}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  invitation: {
    paddingBottom: theme.space.md,
    paddingHorizontal: theme.space.xs,
  },
});
