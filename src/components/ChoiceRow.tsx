import { Pressable, StyleSheet } from 'react-native';

import { theme } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export function ChoiceRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <AppText tone={selected ? 'accent' : 'default'} style={styles.label}>
        {label}
      </AppText>
      {selected && <Icon name="check" color={theme.color.accent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: theme.size.touch,
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
  pressed: { opacity: theme.opacity.pressed },
});
