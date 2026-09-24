import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, useAnimatedValue } from 'react-native';

import { theme } from '../theme';
import { useReducedMotion } from '../motion/ReducedMotion';
import { Icon } from './Icon';

export function Checkmark({ checked }: { checked: boolean }) {
  const reduced = useReducedMotion();
  const scale = useAnimatedValue(1);
  const previous = useRef(checked);
  useEffect(() => {
    const added = checked && !previous.current;
    previous.current = checked;
    if (!added || reduced) return;
    const animation = Animated.sequence([
      Animated.timing(scale, {
        toValue: theme.motion.checkScale,
        duration: theme.motion.checkExpand,
        useNativeDriver: true,
        isInteraction: false,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: theme.motion.checkSettle,
        useNativeDriver: true,
        isInteraction: false,
      }),
    ]);
    animation.start();
    return () => {
      animation.stop();
      scale.setValue(1);
    };
  }, [checked, reduced, scale]);

  return (
    <Animated.View
      accessibilityElementsHidden
      style={[
        styles.check,
        checked && styles.checked,
        { transform: [{ scale }] },
      ]}
    >
      {checked && (
        <Icon
          name="check"
          size={theme.size.iconSmall}
          color={theme.color.onVisited}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  check: {
    width: theme.size.check,
    height: theme.size.check,
    borderRadius: theme.radius.pill,
    borderWidth: theme.stroke.control,
    borderColor: theme.color.controlBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: {
    backgroundColor: theme.color.visited,
    borderColor: theme.color.visitedEmphasis,
  },
});
