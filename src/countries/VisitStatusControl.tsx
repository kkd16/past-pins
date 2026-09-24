import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ChoiceRow } from '../components/ChoiceRow';
import { theme } from '../theme';
import type { VisitFilter } from './filters';

const options: { value: VisitFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'visited', label: 'Visited' },
  { value: 'not-visited', label: 'Not visited' },
];

export function VisitStatusControl({
  value,
  onChange,
}: {
  value: VisitFilter;
  onChange: (value: VisitFilter) => void;
}) {
  const { fontScale } = useWindowDimensions();
  // UISegmentedControl cannot wrap long labels at accessibility text sizes.
  if (fontScale > theme.accessibility.largeTextScale) {
    return (
      <View accessibilityRole="radiogroup" accessibilityLabel="Visit status">
        {options.map((option) => (
          <ChoiceRow
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    );
  }
  return (
    <SegmentedControl
      accessibilityLabel="Visit status"
      values={options.map(({ label }) => label)}
      selectedIndex={options.findIndex((option) => option.value === value)}
      onChange={({ nativeEvent }) =>
        onChange(options[nativeEvent.selectedSegmentIndex].value)
      }
      appearance={theme.appearance.colorScheme}
      tintColor={theme.color.accent}
      fontStyle={{
        fontSize: theme.typography.caption.fontSize * fontScale,
        color: theme.color.textMuted,
      }}
      activeFontStyle={{
        fontSize: theme.typography.caption.fontSize * fontScale,
        color: theme.color.onAccent,
      }}
      style={styles.control}
    />
  );
}

const styles = StyleSheet.create({ control: { height: theme.size.touch } });
