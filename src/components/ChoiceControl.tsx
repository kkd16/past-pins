import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { I18nManager, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

import { language } from '../localization';
import { theme } from '../theme';
import { ChoiceRow } from './ChoiceRow';

export function ChoiceControl<T extends string>({ value, options, onChange, accessibilityLabel, disabled = false, style }: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { fontScale } = useWindowDimensions();
  if (I18nManager.isRTL || fontScale > theme.accessibility.largeTextScale)
    return (
      <View style={style} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
        {options.map((option) => (
          <ChoiceRow key={option.value} label={option.label} selected={value === option.value}
            disabled={disabled} onPress={() => onChange(option.value)} />
        ))}
      </View>
    );
  return (
    <SegmentedControl
      values={options.map(({ label }) => label)}
      selectedIndex={options.findIndex((option) => option.value === value)}
      accessibilityLanguage={language}
      accessibilityLabel={accessibilityLabel}
      enabled={!disabled}
      appearance={theme.appearance.colorScheme}
      tintColor={theme.color.accent}
      backgroundColor={theme.color.surface}
      fontStyle={{ color: theme.color.textMuted }}
      activeFontStyle={{ color: theme.color.onAccent }}
      onChange={({ nativeEvent }) => onChange(options[nativeEvent.selectedSegmentIndex].value)}
      style={[styles.segments, style]}
    />
  );
}

const styles = StyleSheet.create({ segments: { height: theme.size.touch } });
