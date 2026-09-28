import { StyleSheet } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Icon } from '../components/Icon';
import { countries } from '../countries/catalog';
import { isVisited, type AppData } from '../data/model';
import { formatNumber, t } from '../localization';
import { theme } from '../theme';

export function MapSummary({
  places,
  onOpenCountries,
}: {
  places: AppData['places'];
  onOpenCountries: () => void;
}) {
  const visited = countries.filter(({ id }) => isVisited(places[id])).length;
  const label = t('atlas.visitedCount', {
    count: visited,
    total: formatNumber(visited),
  });

  return (
    <AppPressable
      onPress={onOpenCountries}
      accessibilityHint={t('atlas.openCountries')}
      style={styles.summary}
    >
      <AppText variant="heading" tone="visited" style={styles.text}>
        {label}
      </AppText>
      <Icon
        name="chevronRight"
        size={theme.size.iconSmall}
        color={theme.color.accent}
      />
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  summary: {
    ...theme.surface.floating,
    backgroundColor: theme.color.visitedSurface,
    borderColor: theme.color.controlBorder,
    padding: theme.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  text: { flexShrink: 1 },
});
