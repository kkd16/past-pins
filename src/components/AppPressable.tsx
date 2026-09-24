import { useEffect, type ComponentProps } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  useAnimatedValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { language } from '../localization';
import { useReducedMotion } from '../motion/ReducedMotion';
import { theme } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type AppPressableProps = Omit<ComponentProps<typeof Pressable>, 'style'> & {
  style?: StyleProp<ViewStyle>;
};

export function AppPressable({
  disabled,
  style,
  onPressIn,
  onPressOut,
  ...props
}: AppPressableProps) {
  const opacity = useAnimatedValue(1);
  const reduced = useReducedMotion();
  useEffect(() => {
    opacity.setValue(1);
    return () => opacity.stopAnimation();
  }, [disabled, opacity, reduced]);

  return (
    <AnimatedPressable
      accessibilityLanguage={language}
      accessibilityRole="button"
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        opacity.setValue(theme.opacity.pressed);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        Animated.timing(opacity, {
          toValue: 1,
          duration: reduced ? 0 : theme.motion.pressRelease,
          useNativeDriver: true,
          isInteraction: false,
        }).start();
        onPressOut?.(event);
      }}
      style={[
        styles.touchTarget,
        style,
        { opacity: disabled ? theme.opacity.disabled : opacity },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  touchTarget: { minHeight: theme.size.touch, minWidth: theme.size.touch },
});
