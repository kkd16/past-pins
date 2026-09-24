import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, AppState, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-screens/experimental';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import type { CountryId } from '../countries/types';
import { theme } from '../theme';
import { GlobeController } from './controller';
import { globeGestures } from './gestures';
import { GlobeSurface } from './GlobeSurface';

export function GlobeViewport({
  visitedIds,
  onSelect,
}: {
  visitedIds: ReadonlySet<CountryId>;
  onSelect: (id: CountryId) => void;
}) {
  const [failed, setFailed] = useState(false);
  const fail = useCallback((error: unknown) => {
    console.warn('Globe rendering failed', error);
    setFailed(true);
  }, []);
  const [controller] = useState(() => new GlobeController(fail));

  useFocusEffect(
    useCallback(() => {
      controller.setActive(AppState.currentState === 'active');
      const subscription = AppState.addEventListener('change', (state) =>
        controller.setActive(state === 'active'),
      );
      return () => {
        subscription.remove();
        controller.setActive(false);
      };
    }, [controller]),
  );

  useEffect(() => {
    let mounted = true;
    const motion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => controller.setReduceMotion(enabled),
    );
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) controller.setReduceMotion(enabled);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
      motion.remove();
    };
  }, [controller]);

  useEffect(() => {
    controller.setColors(visitedIds);
  }, [controller, visitedIds]);

  const gesture = useMemo(
    () => globeGestures(controller, onSelect),
    [controller, onSelect],
  );

  return (
    <View
      style={styles.fill}
      onLayout={({ nativeEvent: { layout } }) =>
        controller.resize(layout.width, layout.height)
      }
    >
      {!failed && (
        <GestureDetector gesture={gesture}>
          <View
            style={styles.fill}
            collapsable={false}
            accessibilityElementsHidden
          >
            <GlobeSurface controller={controller} onError={fail} />
          </View>
        </GestureDetector>
      )}
      <SafeAreaView
        style={styles.controls}
        pointerEvents="box-none"
        edges={{ top: true, bottom: true, left: true, right: true }}
      >
        {failed ? (
          <View style={styles.error}>
            <AppText variant="heading">The globe couldn’t load.</AppText>
            <AppText tone="muted">
              Your places are still available in Countries.
            </AppText>
            <Button label="Try again" onPress={() => setFailed(false)} />
          </View>
        ) : (
          <IconButton
            name="reset"
            accessibilityLabel="Reset globe"
            onPress={() => controller.reset()}
            style={styles.reset}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  controls: { ...StyleSheet.absoluteFill, alignItems: 'flex-end' },
  reset: {
    ...theme.surface.floating,
    margin: theme.space.lg,
    borderRadius: theme.radius.pill,
  },
  error: {
    margin: theme.space.xl,
    gap: theme.space.md,
    alignSelf: 'center',
    marginVertical: 'auto',
    maxWidth: theme.size.contentMax,
  },
});
