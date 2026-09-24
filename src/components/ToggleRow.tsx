import { StyleSheet, Switch, View } from 'react-native';

import { language } from '../localization';
import { theme } from '../theme';
import { AppText } from './AppText';

export function ToggleRow({
  title,
  description,
  value,
  onValueChange,
  disabled,
  accessibilityLabel = title,
}: {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.text} accessibilityElementsHidden>
        <AppText variant={description ? 'label' : 'body'}>{title}</AppText>
        {description && (
          <AppText variant="caption" tone="muted">
            {description}
          </AppText>
        )}
      </View>
      <Switch
        hitSlop={theme.space.sm}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={description}
        accessibilityLanguage={language}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: theme.color.accent }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: theme.size.row,
    padding: theme.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  text: { flex: 1, gap: theme.space.xs },
});
