import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { theme } from '../theme';
import type { VisitedCountries } from '../hooks/useVisitedCountries';

type VisitsFeedbackProps = Pick<
  VisitedCountries,
  'status' | 'saveError' | 'retry'
>;

export function VisitsFeedback({
  status,
  saveError,
  retry,
}: VisitsFeedbackProps) {
  return (
    <>
      {status === 'loading' && (
        <ActivityIndicator
          style={styles.loading}
          color={theme.color.accent}
          accessibilityLabel="Loading saved visits"
        />
      )}
      {status === 'load-error' && (
        <View style={styles.notice} accessibilityRole="alert">
          <AppText variant="caption">
            Could not load your visits. Try again.
          </AppText>
          <Button label="Try again" variant="quiet" onPress={retry} />
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
});
