import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Checkmark } from '../components/Checkmark';
import { theme } from '../theme';
import type { Country, CountryId } from './types';

export const CountryRow = memo(function CountryRow({
  country,
  visited,
  disabled,
  onVisitedChange,
  onSelect,
}: {
  country: Country;
  visited: boolean;
  disabled: boolean;
  onVisitedChange: (id: CountryId, visited: boolean) => void;
  onSelect: (id: CountryId) => void;
}) {
  return (
    <View style={[styles.row, visited && styles.visited]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${country.name}, ${visited ? 'visited' : 'not visited'}`}
        accessibilityHint="Opens place details"
        onPress={() => onSelect(country.id)}
        style={({ pressed }) => [styles.details, pressed && styles.pressed]}
      >
        <AppText style={visited && styles.visitedLabel}>{country.name}</AppText>
      </Pressable>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`${country.name} visited`}
        accessibilityState={{ checked: visited, disabled }}
        disabled={disabled}
        onPress={() => onVisitedChange(country.id, !visited)}
        style={({ pressed }) => [
          styles.toggle,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Checkmark checked={visited} />
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
  visited: {
    backgroundColor: theme.color.visitedSurface,
  },
  visitedLabel: { color: theme.color.visitedEmphasis },
  details: {
    flex: 1,
    minHeight: theme.size.row,
    justifyContent: 'center',
    padding: theme.space.lg,
  },
  toggle: {
    minHeight: theme.size.row,
    width: theme.size.row,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: theme.opacity.pressed },
  disabled: { opacity: theme.opacity.disabled },
});
