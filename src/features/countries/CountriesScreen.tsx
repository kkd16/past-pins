import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  StyleSheet,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { SearchField } from '../../components/ui/SearchField';
import { theme } from '../../theme';
import { countries } from './catalog';
import { CountryChecklist } from './CountryChecklist';
import { ProgressSummary } from './ProgressSummary';
import type { CountryId } from './types';
import { useVisitedCountries } from './useVisitedCountries';
import { WorldMap } from './WorldMap';

export function CountriesScreen() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<CountryId | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const visits = useVisitedCountries();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener('keyboardWillHide', () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const { setVisited } = visits;
  const onVisitedChange = useCallback(
    (id: CountryId, visited: boolean) => {
      setVisited(id, visited);
      // Haptics are optional feedback; a hardware failure must not prevent a visit.
      Haptics.selectionAsync().catch((error: unknown) =>
        console.warn('Selection haptic unavailable.', error),
      );
    },
    [setVisited],
  );

  function confirmReset() {
    Alert.alert(
      'Reset saved visits?',
      'This replaces the unreadable saved collection with an empty one. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset visits',
          style: 'destructive',
          onPress: () => {
            void visits.resetUnreadableVisits();
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={insets.top}
      >
        <View style={styles.content}>
          {!keyboardVisible && (
            <View style={styles.header}>
              <View>
                <AppText variant="caption" tone="muted" style={styles.brand}>
                  PASTPINS
                </AppText>
                <AppText variant="title">Your world.</AppText>
              </View>
              <View style={styles.brandMark}>
                <Icon name="compass" size={30} color={theme.color.accent} />
              </View>
            </View>
          )}
          <WorldMap
            visitedIds={visits.visitedIds}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onVisitedChange={onVisitedChange}
            disabled={visits.status !== 'ready'}
            compact={keyboardVisible}
          />
          <ProgressSummary
            visited={visits.visitedIds.size}
            total={countries.length}
            loading={visits.status !== 'ready'}
          />
          {visits.status === 'loading' && (
            <ActivityIndicator
              style={styles.loading}
              color={theme.color.accent}
              accessibilityLabel="Loading saved visits"
            />
          )}
          {visits.loadError && visits.status === 'load-error' && (
            <View style={styles.notice} accessibilityRole="alert">
              <AppText variant="caption">{visits.loadError.message}</AppText>
              <View style={styles.actions}>
                <Button
                  label="Try again"
                  variant="quiet"
                  onPress={visits.retry}
                />
                {visits.loadError.canReset && (
                  <Button
                    label="Reset saved visits"
                    variant="quiet"
                    onPress={confirmReset}
                  />
                )}
              </View>
            </View>
          )}
          {visits.saveError && (
            <View style={styles.notice} accessibilityRole="alert">
              <AppText variant="caption">
                Your latest changes haven’t been saved.
              </AppText>
              <Button
                label="Retry save"
                variant="quiet"
                onPress={visits.retry}
              />
            </View>
          )}
          {visits.status === 'ready' &&
            visits.visitedIds.size === 0 &&
            !keyboardVisible && (
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
            disabled={visits.status !== 'ready'}
            onVisitedChange={onVisitedChange}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.background },
  flex: { flex: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: theme.size.contentMax,
    alignSelf: 'center',
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.xs,
    paddingBottom: theme.space.lg,
  },
  brand: { letterSpacing: 2, marginBottom: theme.space.xs },
  brandMark: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.pill,
  },
  loading: { paddingBottom: theme.space.md },
  notice: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.sm,
    padding: theme.space.md,
    marginBottom: theme.space.md,
    gap: theme.space.xs,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
  invitation: {
    paddingBottom: theme.space.md,
    paddingHorizontal: theme.space.xs,
  },
});
