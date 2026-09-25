import { useEffect } from 'react';
import {
  Animated,
  Easing,
  I18nManager,
  StyleSheet,
  useAnimatedValue,
  View,
} from 'react-native';

import { AppText } from '../components/AppText';
import { theme } from '../theme';
import { useReducedMotion } from '../motion/ReducedMotion';
import { t, formatNumber, formatPercent, language } from '../localization';

export function ProgressSummary({
  visited,
  total,
  loading,
  label = t('countries.stats.visited'),
}: {
  visited: number;
  total: number;
  loading: boolean;
  label?: string;
}) {
  const visitedRatio = total ? visited / total : 0;
  const reduced = useReducedMotion();
  const fraction = loading ? 0 : visitedRatio;
  const progress = useAnimatedValue(fraction);
  useEffect(() => {
    if (reduced) {
      progress.setValue(fraction);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: fraction,
      duration: theme.motion.progress,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [fraction, progress, reduced]);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLanguage={language}
      accessibilityLabel={label}
      accessibilityValue={
        loading
          ? { text: t('countries.loadingPlaces') }
          : {
              min: 0,
              max: total,
              now: visited,
              text: t('countries.stats.progressValue', {
                visited: formatNumber(visited),
                total: formatNumber(total),
                percent: formatPercent(visitedRatio),
              }),
            }
      }
      style={styles.container}
    >
      <View style={styles.labels}>
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>
        <AppText variant="label" tone="visited" style={styles.number}>
          {loading ? '—' : formatPercent(visitedRatio)}
        </AppText>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, { transform: [{ scaleX: progress }] }]}
        />
      </View>
      <AppText variant="caption" tone="muted">
        {loading
          ? '—'
          : t('countries.stats.progress', {
              visited: formatNumber(visited),
              total: formatNumber(total),
            })}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.space.sm,
    paddingHorizontal: theme.space.xs,
    paddingVertical: theme.space.lg,
  },
  labels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  label: { flexGrow: 1, flexBasis: 150 },
  number: { fontVariant: ['tabular-nums'] },
  track: {
    height: theme.size.progress,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    transformOrigin: I18nManager.isRTL ? 'right' : 'left',
    backgroundColor: theme.color.visitedEmphasis,
    borderRadius: theme.radius.pill,
  },
});
