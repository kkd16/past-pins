import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Checkmark } from '../components/Checkmark';
import { Icon } from '../components/Icon';
import { isVisited, type PlaceStatus } from '../data/model';
import { theme } from '../theme';
import { t } from '../localization';
import { getStatusPresentation } from './status';
import type { Country, CountryId } from './types';

export const CountryRow = memo(function CountryRow({
  country,
  status,
  home,
  disabled,
  selecting,
  selected,
  onChangeStatus,
  onSelect,
}: {
  country: Country;
  status: PlaceStatus;
  home: boolean;
  disabled: boolean;
  selecting: boolean;
  selected: boolean;
  onChangeStatus: (id: CountryId) => void;
  onSelect: (id: CountryId) => void;
}) {
  const presentation = getStatusPresentation(status, home);
  return (
    <View
      style={[
        styles.row,
        (selecting ? selected : isVisited(status)) && styles.highlight,
      ]}
    >
      <AppPressable
        accessibilityRole={selecting ? 'checkbox' : 'button'}
        accessibilityLabel={t('countries.countryStatus', {
          name: country.name,
          status: presentation.label,
        })}
        accessibilityHint={selecting ? undefined : t('countries.detailsHint')}
        accessibilityState={selecting ? { checked: selected } : undefined}
        disabled={selecting && disabled}
        onPress={() => onSelect(country.id)}
        style={styles.details}
      >
        <View style={styles.label}>
          <AppText>{country.name}</AppText>
          {status !== 'unvisited' && (
            <AppText variant="caption" style={{ color: presentation.color }}>
              {presentation.label}
            </AppText>
          )}
        </View>
        {selecting && <Checkmark checked={selected} />}
      </AppPressable>
      {!selecting && (
        <AppPressable
          accessibilityLabel={t('countries.changeStatus', {
            name: country.name,
            status: presentation.label,
          })}
          disabled={disabled}
          onPress={() => onChangeStatus(country.id)}
          style={styles.toggle}
        >
          {status === 'wishlist' || status === 'lived' || home ? (
            <View style={[styles.status, { borderColor: presentation.color }]}>
              <Icon
                name={presentation.icon}
                color={presentation.color}
                size={theme.size.iconSmall}
              />
            </View>
          ) : (
            <Checkmark checked={status === 'visited'} />
          )}
        </AppPressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.surface,
  },
  highlight: { backgroundColor: theme.color.visitedSurface },
  details: {
    flex: 1,
    minHeight: theme.size.row,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.lg,
    padding: theme.space.lg,
  },
  label: { flex: 1, gap: theme.space.xs },
  toggle: {
    minHeight: theme.size.row,
    width: theme.size.row,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    width: theme.size.check,
    height: theme.size.check,
    borderRadius: theme.radius.pill,
    borderWidth: theme.stroke.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
