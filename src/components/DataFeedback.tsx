import { ActivityIndicator, StyleSheet } from 'react-native';

import { useAppData } from '../data/AppDataProvider';
import { theme } from '../theme';
import { t, language } from '../localization';
import { AppText } from './AppText';
import { Button } from './Button';
import { Surface } from './Surface';

export function DataFeedback() {
  const { status, saveError, retry, busy } = useAppData();
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
