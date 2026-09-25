import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { IconButton } from '../components/IconButton';
import { Surface } from '../components/Surface';
import { getStatusPresentation } from '../countries/status';
import type { PlaceStatus } from '../data/model';
import { language, t } from '../localization';
import { theme, type TextVariant } from '../theme';
import { PlaceStatusControl } from './PlaceStatusControl';

export function PlaceSelectionCard(
  props: ComponentProps<typeof PlaceSelectionContent>,
) {
  return (
    <Surface
      variant="floating"
      style={styles.card}
      onAccessibilityEscape={props.onEscape ?? props.onDismiss}
    >
      <PlaceSelectionContent {...props} />
    </Surface>
  );
}

export function PlaceSelectionContent({
  title,
  titleVariant = 'label',
  subtitle,
  status,
  home = false,
  disabled = false,
  onChangeStatus,
  onSaveToLists,
  onDismiss,
  onEscape = onDismiss,
  onDetails,
  expanded = false,
  autofocus = false,
  children,
}: {
  title: string;
  titleVariant?: TextVariant;
  subtitle?: string;
  status?: PlaceStatus;
  home?: boolean;
  disabled?: boolean;
  onChangeStatus: (status: PlaceStatus) => void;
  onSaveToLists: () => void;
  onDismiss: () => void;
  onEscape?: () => void;
  onDetails?: () => void;
  expanded?: boolean;
  autofocus?: boolean;
  children?: ReactNode;
}) {
  const heading = useRef<View>(null);
  const presentation = status ? getStatusPresentation(status, home) : undefined;
  const place = subtitle
    ? t('common.placeSubtitle', { place: title, subtitle })
    : title;
  useEffect(() => {
    if (autofocus && heading.current)
      AccessibilityInfo.sendAccessibilityEvent(heading.current, 'focus');
  }, [autofocus, title]);
  const Heading = onDetails ? AppPressable : View;
  return (
    <>
      <View style={styles.heading}>
        <Heading
          ref={heading}
          collapsable={false}
          accessible
          accessibilityLanguage={language}
          accessibilityRole={onDetails ? 'button' : 'header'}
          accessibilityLabel={
            presentation
              ? t('common.placeStatus', { place, status: presentation.label })
              : place
          }
          accessibilityHint={
            onDetails
              ? t(expanded ? 'atlas.collapseDetails' : 'atlas.openDetails')
              : undefined
          }
          accessibilityState={onDetails ? { expanded } : undefined}
          accessibilityActions={[
            { name: 'dismiss', label: t('common.clearSelection') },
          ]}
          onAccessibilityAction={({ nativeEvent }) => {
            if (nativeEvent.actionName === 'dismiss') onDismiss();
          }}
          onAccessibilityEscape={onEscape}
          onPress={onDetails}
          style={styles.title}
        >
          <AppText variant={titleVariant}>
            {title}
          </AppText>
          {subtitle && (
            <AppText variant="caption" tone="muted">
              {subtitle}
            </AppText>
          )}
          {presentation && (
            <AppText variant="caption" style={{ color: presentation.color }}>
              {presentation.label}
            </AppText>
          )}
        </Heading>
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
      {status && (
        <PlaceStatusControl
          status={status}
          disabled={disabled}
          onChange={onChangeStatus}
        />
      )}
      {children}
    </>
  );
}

const styles = StyleSheet.create({
  card: { padding: theme.space.md, gap: theme.space.sm },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space.sm,
  },
  title: { flex: 1, gap: theme.space.xs },
});
