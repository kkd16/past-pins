import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText } from '../components/AppText';
import { Icon } from '../components/Icon';
import { countryById } from '../countries/catalog';
import { getStatusPresentation } from '../countries/status';
import type { SavedStatus } from '../data/model';
import { language, t } from '../localization';
import { theme } from '../theme';

export function CountryCallout({
  countryId,
  status,
  home,
  onDetails,
  onDismiss,
  autofocus = false,
  style,
  onLayout,
}: {
  countryId: string;
  status: SavedStatus | undefined;
  home: boolean;
  onDetails: (id: string) => void;
  onDismiss: () => void;
  autofocus?: boolean;
  style?: StyleProp<ViewStyle>;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const ref = useRef<View>(null);
  const country = countryById.get(countryId);
  const presentation = getStatusPresentation(status, home);
  useEffect(() => {
    if (autofocus && ref.current)
      AccessibilityInfo.sendAccessibilityEvent(ref.current, 'focus');
  }, [autofocus, countryId]);
  if (!country) return null;
  return (
    <Pressable
      ref={ref}
      accessible
      accessibilityRole="button"
      accessibilityLanguage={language}
      accessibilityLabel={t('atlas.countryStatus', {
        country: country.name,
        status: presentation.label,
      })}
      accessibilityHint={t('atlas.openDetails')}
      accessibilityActions={[
        { name: 'dismiss', label: t('atlas.dismissSelection') },
      ]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === 'dismiss') onDismiss();
      }}
      onAccessibilityEscape={onDismiss}
      onPress={() => onDetails(country.id)}
      onLayout={onLayout}
      style={({ pressed }) => [
        styles.callout,
        style,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        <AppText variant="label">{country.name}</AppText>
        <View style={styles.status}>
          <Icon
            name={presentation.icon}
            color={presentation.color}
            size={theme.size.iconSmall}
          />
          <AppText
            variant="caption"
            style={{ color: presentation.color, flexShrink: 1 }}
          >
            {presentation.label}
          </AppText>
        </View>
      </View>
      <Icon name="chevronRight" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  callout: {
    ...theme.surface.floating,
    minHeight: theme.size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    padding: theme.space.md,
    borderWidth: theme.stroke.subtle,
    borderColor: theme.color.controlBorder,
  },
  content: { flex: 1, gap: theme.space.xs },
  status: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  pressed: { opacity: theme.opacity.pressed },
});
