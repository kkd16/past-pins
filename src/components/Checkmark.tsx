import { StyleSheet, View } from 'react-native';

import { theme } from '../theme';
import { Icon } from './Icon';

export function Checkmark({ checked }: { checked: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      style={[styles.check, checked && styles.checked]}
    >
      {checked && <Icon name="check" size={18} color={theme.color.onAccent} />}
    </View>
  );
}

const styles = StyleSheet.create({
  check: {
    width: theme.size.check,
    height: theme.size.check,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.color.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: {
    backgroundColor: theme.color.accent,
    borderColor: theme.color.accent,
  },
});
