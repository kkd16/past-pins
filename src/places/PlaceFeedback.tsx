import { StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { t } from '../localization';
import { theme } from '../theme';

export function PlaceFeedback({ loading, error, onRetry }: {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (!loading && !error) return null;
  return (
    <View style={styles.feedback}>
      <AppText tone="muted" accessibilityLiveRegion="polite">
        {t(error ? 'places.loadError' : 'places.loading')}
      </AppText>
      {error && <Button label={t('places.retry')} variant="quiet" onPress={onRetry} />}
    </View>
  );
}

export function PlaceSearchFooter({ loading, error, retry, more, loadMore }: {
  loading: boolean;
  error: boolean;
  retry: () => void;
  more: boolean;
  loadMore: () => void;
}) {
  return (
    <>
      <PlaceFeedback loading={loading} error={error} onRetry={retry} />
      {more && <Button label={t('places.more')} variant="quiet" disabled={loading || error} onPress={loadMore} />}
    </>
  );
}

const styles = StyleSheet.create({ feedback: { gap: theme.space.sm, paddingVertical: theme.space.md } });
