import { ActivityIndicator, StyleSheet } from 'react-native';

import { appData } from '../data/app-data';
import { useAppData } from '../data/AppData';
import { theme } from '../theme';
import { t, language } from '../localization';
import { AppText } from './AppText';
import { Button } from './Button';
import { Surface } from './Surface';

export function DataFeedback() {
  const { retry } = appData;
  const status = useAppData((snapshot) => snapshot.status);
  const saveError = useAppData((snapshot) => snapshot.saveError);
  const busy = useAppData((snapshot) => snapshot.busy);
  if (status === 'loading')
    return (
      <ActivityIndicator
        accessible
        color={theme.color.accent}
        accessibilityLabel={t('countries.loadingPlaces')}
        accessibilityLanguage={language}
        accessibilityState={{ busy: true }}
      />
    );
  if (status !== 'load-error' && !saveError) return null;
  return (
    <Surface style={styles.notice}>
      <AppText variant="caption">
        {status === 'load-error'
          ? t('countries.loadError')
          : t('countries.saveError')}
      </AppText>
      <Button
        label={t('common.retry')}
        variant="quiet"
        disabled={busy}
        onPress={retry}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  notice: { padding: theme.space.md, gap: theme.space.sm },
});
