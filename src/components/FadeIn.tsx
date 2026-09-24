import { useEffect, useMemo } from 'react';
import { Animated, Easing, useAnimatedValue, type ViewProps } from 'react-native';

import { useReducedMotion } from '../motion/ReducedMotion';
import { theme } from '../theme';

export function FadeIn({ style, ...props }: ViewProps) {
  const reduced = useReducedMotion();
  const progress = useAnimatedValue(reduced ? 1 : 0);
  const appearance = useMemo(
    () => ({
      opacity: progress,
      transform: [
        {
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [theme.motion.lift, 0],
          }),
        },
      ],
    }),
    [progress],
  );
  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: theme.motion.enter,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduced]);
  return <Animated.View {...props} style={[appearance, style]} />;
}
