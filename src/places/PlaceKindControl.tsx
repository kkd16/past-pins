import SegmentedControl from '@react-native-segmented-control/segmented-control';
import {
  I18nManager,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { ChoiceRow } from '../components/ChoiceRow';
import { language, t } from '../localization';
import { theme } from '../theme';

export type PlacesMode = 'countries' | 'regions';

export function PlaceKindControl({
  value,
  onChange,
}: {
  value: PlacesMode;
  onChange: (value: PlacesMode) => void;
}) {
  const { fontScale } = useWindowDimensions();
  const options: { value: PlacesMode; label: string }[] = [
    { value: 'countries', label: t('places.countries') },
    { value: 'regions', label: t('places.regions') },
  ];
  if (I18nManager.isRTL || fontScale > theme.accessibility.largeTextScale)
    return (
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('places.modeLabel')}
      >
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
  return (
    <SegmentedControl
      values={options.map(({ label }) => label)}
      selectedIndex={options.findIndex((option) => option.value === value)}
      accessibilityLanguage={language}
      accessibilityLabel={t('places.modeLabel')}
      appearance={theme.appearance.colorScheme}
      tintColor={theme.color.accent}
      backgroundColor={theme.color.surface}
      fontStyle={{ color: theme.color.textMuted }}
      activeFontStyle={{ color: theme.color.onAccent }}
      onChange={({ nativeEvent }) =>
        onChange(options[nativeEvent.selectedSegmentIndex].value)
      }
      style={styles.segments}
    />
  );
}

const styles = StyleSheet.create({ segments: { height: theme.size.touch } });
