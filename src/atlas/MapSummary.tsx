import { StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Surface } from '../components/Surface';
import { getStatusPresentation } from '../countries/status';
import { isVisited, type AppData } from '../data/model';
import { formatNumber, language, t } from '../localization';
import { theme } from '../theme';

export function MapSummary({
  places,
  mode,
  screenReader,
  onOpenCountries,
}: {
  places: AppData['places'];
  mode: AppData['preferences']['mapView'];
  screenReader: boolean;
  onOpenCountries: () => void;
}) {
  const statuses = Object.values(places);
  const visited = statuses.filter(isVisited).length;

  return (
    <Surface variant="floating" style={styles.summary}>
      <View
        accessible
        accessibilityLanguage={language}
        accessibilityLabel={t('atlas.visitedCount', {
          count: visited,
          total: formatNumber(visited),
        })}
        style={styles.heading}
      >
        <AppText variant="number" tone="visited">
          {formatNumber(visited)}
        </AppText>
        <View style={styles.text}>
          <AppText variant="label">{t('atlas.placesVisited')}</AppText>
          {!screenReader && (
            <AppText variant="caption" tone="muted">
              {mode === 'globe' ? t('atlas.globeGestures') : t('atlas.mapGestures')}
            </AppText>
          )}
        </View>
      </View>
      <View style={styles.legend}>
        {(['visited', 'wishlist', 'lived'] as const).map((status) => {
          const { icon, color, label } = getStatusPresentation(status);
          return (
            <View key={status} style={styles.legendItem}>
              <Icon name={icon} color={color} size={theme.size.iconSmall} />
              <AppText variant="caption" style={{ color }}>
                {label}
              </AppText>
            </View>
          );
        })}
      </View>
      {!statuses.length && (
        <Button
          label={t('atlas.addPlace')}
          onPress={onOpenCountries}
          variant="quiet"
        />
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  summary: { padding: theme.space.md, gap: theme.space.md },
  heading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.space.md,
  },
  text: { flex: 1, minWidth: 150, gap: theme.space.xs },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
});
