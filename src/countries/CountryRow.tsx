import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Checkmark } from '../components/Checkmark';
import { Icon } from '../components/Icon';
import { isVisited, type PlaceStatus } from '../data/model';
import { theme } from '../theme';
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
  const label = (
    <View style={styles.label}>
      <AppText>{country.name}</AppText>
      {status !== 'unvisited' && (
        <AppText variant="caption" style={{ color: presentation.color }}>
          {presentation.label}
        </AppText>
      )}
    </View>
  );

  if (selecting)
    return (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={country.name}
        accessibilityState={{ checked: selected, disabled }}
        disabled={disabled}
        onPress={() => onSelect(country.id)}
        style={({ pressed }) => [
          styles.row,
          styles.selection,
          selected && styles.highlight,
          pressed && styles.pressed,
        ]}
      >
        {label}
        <Checkmark checked={selected} />
      </Pressable>
    );

  return (
    <View style={[styles.row, isVisited(status) && styles.highlight]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={country.name + ', ' + presentation.label}
        accessibilityHint="Opens place details"
        onPress={() => onSelect(country.id)}
        style={({ pressed }) => [styles.details, pressed && styles.pressed]}
      >
        {label}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          'Change status for ' + country.name + ', ' + presentation.label
        }
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => onChangeStatus(country.id)}
        style={({ pressed }) => [
          styles.toggle,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
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
      </Pressable>
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
  selection: {
    minHeight: theme.size.row,
    padding: theme.space.lg,
    gap: theme.space.lg,
  },
  details: {
    flex: 1,
    minHeight: theme.size.row,
    justifyContent: 'center',
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
  pressed: { opacity: theme.opacity.pressed },
  disabled: { opacity: theme.opacity.disabled },
});
