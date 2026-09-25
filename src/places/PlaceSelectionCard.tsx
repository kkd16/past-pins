import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { GestureDetector, type NativeGesture } from 'react-native-gesture-handler';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Icon } from '../components/Icon';
import { IconButton } from '../components/IconButton';
import { Surface } from '../components/Surface';
import { getStatusPresentation } from '../countries/status';
import type { PlaceStatus } from '../data/model';
import { language, t } from '../localization';
import { useActionGuard } from '../navigation/useActionGuard';
import { theme } from '../theme';
import { countryDetailsGesture } from './details-gesture';
import { PlaceStatusControl } from './PlaceStatusControl';

export function PlaceSelectionCard({
  title,
  subtitle,
  status,
  home = false,
  disabled = false,
  onChangeStatus,
  onSaveToLists,
  onDismiss,
  onDetails,
  scrollGesture,
  autofocus = false,
  children,
}: {
  title: string;
  subtitle?: string;
  status: PlaceStatus;
  home?: boolean;
  disabled?: boolean;
  onChangeStatus: (status: PlaceStatus) => void;
  onSaveToLists: () => void;
  onDismiss: () => void;
  onDetails?: () => void;
  scrollGesture?: NativeGesture;
  autofocus?: boolean;
  children?: ReactNode;
}) {
  const heading = useRef<View>(null);
  const guard = useActionGuard(title);
  const swipe = useMemo(() => {
    const gesture = countryDetailsGesture(onDetails, guard);
    if (scrollGesture) gesture.blocksExternalGesture(scrollGesture);
    return gesture;
  }, [onDetails, guard, scrollGesture]);
  const presentation = getStatusPresentation(status, home);
  useEffect(() => {
    if (autofocus && heading.current)
      AccessibilityInfo.sendAccessibilityEvent(heading.current, 'focus');
  }, [autofocus, title]);
  const Heading = onDetails ? AppPressable : View;
  const titleContent = (
    <Heading
      ref={heading}
      collapsable={false}
      accessible
      accessibilityLanguage={language}
      accessibilityRole={onDetails ? 'button' : 'header'}
      accessibilityLabel={t('common.placeStatus', {
        place: subtitle
          ? t('common.placeSubtitle', { place: title, subtitle })
          : title,
        status: presentation.label,
      })}
      accessibilityHint={onDetails ? t('atlas.openDetails') : undefined}
      accessibilityActions={[
        { name: 'dismiss', label: t('common.clearSelection') },
      ]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === 'dismiss') onDismiss();
      }}
      onAccessibilityEscape={onDismiss}
      onPress={onDetails}
      style={styles.title}
    >
      <View style={styles.titleLine}>
        <AppText
          variant="label"
          tone={onDetails ? 'accent' : 'default'}
          style={styles.name}
        >
          {title}
        </AppText>
        {onDetails && <Icon name="chevronUp" color={theme.color.accent} />}
      </View>
      {subtitle && (
        <AppText variant="caption" tone="muted">
          {subtitle}
        </AppText>
      )}
      <AppText variant="caption" style={{ color: presentation.color }}>
        {presentation.label}
      </AppText>
      {onDetails && (
        <AppText variant="caption" tone="muted">
          {t('atlas.expandDetails')}
        </AppText>
      )}
    </Heading>
  );

  return (
    <Surface
      variant="floating"
      style={styles.card}
      onAccessibilityEscape={onDismiss}
    >
      <View style={styles.heading}>
        {onDetails ? (
          <GestureDetector gesture={swipe}>{titleContent}</GestureDetector>
        ) : (
          titleContent
        )}
        <IconButton
          name="list"
          accessibilityLabel={t('lists.saveToLists')}
          disabled={disabled}
          onPress={onSaveToLists}
        />
        <IconButton
          name="close"
          accessibilityLabel={t('common.clearSelection')}
          onPress={onDismiss}
        />
      </View>
      <PlaceStatusControl
        status={status}
        disabled={disabled}
        onChange={onChangeStatus}
      />
      {children}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { padding: theme.space.md, gap: theme.space.sm },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.space.sm },
  title: { flex: 1, gap: theme.space.xs },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  name: { flex: 1 },
});
