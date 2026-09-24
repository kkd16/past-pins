import { ActivityIndicator, StyleSheet } from 'react-native';

import { useAppData } from '../data/AppDataProvider';
import { theme } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Surface } from './Surface';

export function DataFeedback() {
  const { status, saveError, retry } = useAppData();
  if (status === 'loading')
    return (
      <ActivityIndicator
        color={theme.color.accent}
        accessibilityLabel="Loading your places"
      />
    );
  if (status !== 'load-error' && !saveError) return null;
  return (
    <Surface style={styles.notice}>
      <AppText variant="caption">
        {status === 'load-error'
          ? 'Could not load your places. Try again.'
          : 'Your latest changes haven’t been saved.'}
      </AppText>
      <Button
        label={status === 'load-error' ? 'Try again' : 'Retry save'}
        variant="quiet"
        onPress={retry}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  notice: { padding: theme.space.md, gap: theme.space.sm },
});
