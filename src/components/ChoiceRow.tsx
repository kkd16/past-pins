import { StyleSheet } from 'react-native';

import { theme } from '../theme';
import { AppPressable } from './AppPressable';
import { AppText } from './AppText';
import { Icon } from './Icon';

export function ChoiceRow({
  label,
  selected,
  onPress,
  disabled = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <AppPressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.row, selected && styles.selected]}
    >
      <AppText tone={selected ? 'accent' : 'default'} style={styles.label}>
        {label}
      </AppText>
      {selected && <Icon name="check" color={theme.color.accent} />}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    padding: theme.space.md,
    borderRadius: theme.radius.sm,
  },
  label: { flex: 1 },
  selected: {
    backgroundColor: theme.color.selectedSurface,
  },
});
