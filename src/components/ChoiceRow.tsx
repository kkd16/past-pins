import { StyleSheet, View } from 'react-native';

import { theme } from '../theme';
import { AppPressable } from './AppPressable';
import { AppText } from './AppText';
import { Icon } from './Icon';

export function ChoiceRow({
  label,
  description,
  selected,
  onPress,
  disabled = false,
}: {
  label: string;
  description?: string;
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
      <View style={styles.label}>
        <AppText tone={selected ? 'accent' : 'default'}>{label}</AppText>
        {description && <AppText variant="caption" tone="muted">{description}</AppText>}
      </View>
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
  label: { flex: 1, gap: theme.space.xs },
  selected: {
    backgroundColor: theme.color.selectedSurface,
  },
});
