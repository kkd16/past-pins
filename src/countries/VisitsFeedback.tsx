import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { theme } from '../theme';
import type { VisitedCountries } from '../hooks/useVisitedCountries';

type VisitsFeedbackProps = Pick<
  VisitedCountries,
  'status' | 'loadError' | 'saveError' | 'retry' | 'resetUnreadableVisits'
>;

export function VisitsFeedback({
  status,
  loadError,
  saveError,
  retry,
  resetUnreadableVisits,
}: VisitsFeedbackProps) {
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
            void resetUnreadableVisits();
          },
        },
      ],
    );
  }

  return (
    <>
      {status === 'loading' && (
        <ActivityIndicator
          style={styles.loading}
          color={theme.color.accent}
          accessibilityLabel="Loading saved visits"
        />
      )}
      {status === 'load-error' && loadError && (
        <View style={styles.notice} accessibilityRole="alert">
          <AppText variant="caption">{loadError.message}</AppText>
          <View style={styles.actions}>
            <Button label="Try again" variant="quiet" onPress={retry} />
            {loadError.canReset && (
              <Button
                label="Reset saved visits"
                variant="quiet"
                onPress={confirmReset}
              />
            )}
          </View>
        </View>
      )}
      {saveError && (
        <View style={styles.notice} accessibilityRole="alert">
          <AppText variant="caption">
            Your latest changes haven’t been saved.
          </AppText>
          <Button label="Retry save" variant="quiet" onPress={retry} />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loading: { paddingBottom: theme.space.md },
  notice: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.sm,
    padding: theme.space.md,
    marginBottom: theme.space.md,
    gap: theme.space.xs,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
});
