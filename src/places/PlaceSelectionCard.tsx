import { useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { IconButton } from '../components/IconButton';
import { Surface } from '../components/Surface';
import { getStatusPresentation } from '../countries/status';
import type { PlaceStatus } from '../data/model';
import { language, t } from '../localization';
import { theme } from '../theme';
import { PlaceStatusControl } from './PlaceStatusControl';

export function PlaceSelectionCard({
  title,
  subtitle,
  status,
  home = false,
  disabled = false,
  onChangeStatus,
  onMore,
  onDismiss,
  onDetails,
  autofocus = false,
  children,
}: {
  title: string;
  subtitle?: string;
  status: PlaceStatus;
  home?: boolean;
  disabled?: boolean;
  onChangeStatus: (status: PlaceStatus) => void;
  onMore: () => void;
  onDismiss: () => void;
  onDetails?: () => void;
  autofocus?: boolean;
  children?: ReactNode;
}) {
  const heading = useRef<View>(null);
  const presentation = getStatusPresentation(status, home);
  useEffect(() => {
    if (autofocus && heading.current)
      AccessibilityInfo.sendAccessibilityEvent(heading.current, 'focus');
  }, [autofocus, title]);
  const Heading = onDetails ? AppPressable : View;

  return (
    <Surface
      variant="floating"
      style={styles.card}
      onAccessibilityEscape={onDismiss}
    >
      <View style={styles.heading}>
        <Heading
          ref={heading}
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
          <View style={styles.name}>
            <AppText variant="label" style={styles.text}>
              {title}
            </AppText>
            {onDetails && <Icon name="chevronRight" />}
          </View>
          {subtitle && (
            <AppText variant="caption" tone="muted">
              {subtitle}
            </AppText>
          )}
          <AppText variant="caption" style={{ color: presentation.color }}>
            {presentation.label}
          </AppText>
        </Heading>
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
      <View style={styles.actions}>
        {children && <View style={styles.additional}>{children}</View>}
        <Button
          label={t('common.more')}
          variant="quiet"
          disabled={disabled}
          onPress={onMore}
        />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { padding: theme.space.md, gap: theme.space.sm },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.space.sm },
  title: { flex: 1, gap: theme.space.xs },
  name: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  text: { flex: 1 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.space.xs,
  },
  additional: { flexGrow: 1, flexShrink: 1 },
});
