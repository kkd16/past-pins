import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  useAnimatedValue,
  View,
  type PressableProps,
} from 'react-native';

import { theme } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export type CheckRowProps = Omit<PressableProps, 'children' | 'onPress'> & {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  leading?: ReactNode;
};

export function CheckRow({
  label,
  checked,
  onCheckedChange,
  leading,
  disabled,
  style,
  ...props
}: CheckRowProps) {
  const scale = useAnimatedValue(1);
  const previous = useRef(checked);

  useEffect(() => {
    if (previous.current === checked) return;
    previous.current = checked;
    scale.stopAnimation();
    scale.setValue(0.82);
    const animation = Animated.spring(scale, {
      toValue: 1,
      ...theme.motion.spring,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [checked, scale]);

  return (
    <Pressable
      {...props}
      disabled={disabled}
      onPress={() => onCheckedChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={{
        ...props.accessibilityState,
        checked,
        disabled: !!disabled,
      }}
      style={(state) => [
        styles.row,
        checked && styles.selected,
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {leading && <View accessibilityElementsHidden>{leading}</View>}
      <AppText style={styles.label}>{label}</AppText>
      <Animated.View
        accessibilityElementsHidden
        style={[
          styles.check,
          checked && styles.checked,
          { transform: [{ scale }] },
        ]}
      >
        {checked && (
          <Icon name="check" size={18} color={theme.color.onAccent} />
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: theme.size.row,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    borderRadius: theme.radius.sm,
  },
  selected: { backgroundColor: theme.color.selectedSurface },
  pressed: {
    opacity: theme.opacity.pressed,
    backgroundColor: theme.color.surface,
  },
  disabled: { opacity: theme.opacity.disabled },
  label: { flex: 1 },
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
