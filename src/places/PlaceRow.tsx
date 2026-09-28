import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Icon } from '../components/Icon';
import { IconButton } from '../components/IconButton';
import { getStatusPresentation } from '../countries/status';
import type { PlaceStatus } from '../data/model';
import { t } from '../localization';
import { theme } from '../theme';
import { formatPlaceName, getPlaceSubtitle, type Place } from './catalog';

export const PlaceRow = memo(function PlaceRow({ place, status, home, disabled, onPress, onChangeStatus }: {
  place: Place;
  status: PlaceStatus;
  home?: boolean;
  disabled: boolean;
  onPress: (place: Place) => void;
  onChangeStatus?: (place: Place) => void;
}) {
  const presentation = getStatusPresentation(status, home);
  const name = formatPlaceName(place);
  return (
    <View style={styles.row}>
      <AppPressable
        disabled={disabled}
        accessibilityLabel={t('lists.placeStatus', { name, status: presentation.label })}
        accessibilityHint={onChangeStatus ? t('lists.openPlace') : undefined}
        onPress={() => onPress(place)}
        style={styles.place}
      >
        <View style={styles.name}>
          <AppText>{place.name}</AppText>
          <AppText variant="caption" tone="muted">
            {t('countries.countrySubtitle', { continent: getPlaceSubtitle(place), status: presentation.label })}
          </AppText>
        </View>
        <Icon name={onChangeStatus ? 'chevronRight' : presentation.icon} color={onChangeStatus ? undefined : presentation.color} />
      </AppPressable>
      {onChangeStatus && (
        <IconButton
          name={presentation.icon}
          color={presentation.color}
          accessibilityLabel={t('lists.changePlaceStatus', { name })}
          disabled={disabled}
          onPress={() => onChangeStatus(place)}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { ...theme.surface.panel, flexDirection: 'row', alignItems: 'center', paddingEnd: theme.space.sm },
  place: { flex: 1, minHeight: theme.size.row, flexDirection: 'row', alignItems: 'center', gap: theme.space.md, padding: theme.space.lg },
  name: { flex: 1, gap: theme.space.xs },
});
