import { useEffect, useEffectEvent, useMemo } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  useAnimatedValue,
} from 'react-native';

import { useScreenReaderEnabled } from '../accessibility/useScreenReaderEnabled';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { t } from '../localization';
import { useReducedMotion } from '../motion/ReducedMotion';
import { theme } from '../theme';
import type { ToastSnapshot } from './store';

export function Toast({
  toast,
  actionDisabled,
  onDismiss,
  onRemove,
  onAction,
}: {
  toast: ToastSnapshot;
  actionDisabled: boolean;
  onDismiss: () => void;
  onRemove: () => void;
  onAction: () => void;
}) {
  const { id, message, action, visible } = toast;
  const reduced = useReducedMotion();
  const screenReaderEnabled = useScreenReaderEnabled();
  const progress = useAnimatedValue(reduced ? 1 : 0);
  const dismiss = useEffectEvent(onDismiss);
  const remove = useEffectEvent(onRemove);
  const announce = useEffectEvent(() => {
    AccessibilityInfo.announceForAccessibilityWithOptions(
      action
        ? t('common.toastAnnouncement', { message, action: action.label })
        : message,
      { queue: true },
    );
  });
  const appearance = useMemo(
    () => ({
      opacity: progress,
      transform: [
        {
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [-theme.motion.lift, 0],
          }),
        },
      ],
    }),
    [progress],
  );

  useEffect(() => {
    if (visible) announce();
  }, [id, visible]);

  useEffect(() => {
    if (!visible || actionDisabled) return;
    const timeout = setTimeout(
      () => dismiss(),
      screenReaderEnabled ? 15_000 : 6_000,
    );
    return () => clearTimeout(timeout);
  }, [id, visible, actionDisabled, screenReaderEnabled]);

  useEffect(() => {
    if (reduced) {
      progress.setValue(visible ? 1 : 0);
      if (!visible) remove();
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: theme.motion.enter,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) remove();
    });
    return () => animation.stop();
  }, [progress, reduced, visible]);

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityElementsHidden={!visible}
      style={[styles.card, appearance]}
    >
      <View style={styles.content}>
        <AppText style={styles.message}>{message}</AppText>
        {action ? (
          <Button
            label={action.label}
            variant="quiet"
            disabled={actionDisabled}
            onPress={onAction}
          />
        ) : null}
      </View>
      <IconButton
        name="close"
        accessibilityLabel={t('common.dismissNotification')}
        onPress={onDismiss}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...theme.surface.floating,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    padding: theme.space.sm,
    paddingStart: theme.space.lg,
    borderWidth: theme.stroke.subtle,
    borderColor: theme.color.border,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.space.xs,
  },
  message: { flexGrow: 1, flexShrink: 1, flexBasis: 180 },
});
