import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { I18nManager, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ChoiceRow } from '../components/ChoiceRow';
import { language, t } from '../localization';
import { theme } from '../theme';

export type SubdivisionView = 'map' | 'list';

export function SubdivisionViewControl({
  value,
  onChange,
}: {
  value: SubdivisionView;
  onChange: (value: SubdivisionView) => void;
}) {
  const { fontScale } = useWindowDimensions();
  const options = [
    { value: 'map', label: t('subdivisions.mapView') },
    { value: 'list', label: t('subdivisions.listView') },
  ] as const;

  if (I18nManager.isRTL || fontScale > theme.accessibility.largeTextScale)
    return (
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('subdivisions.viewLabel')}
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
      accessibilityLabel={t('subdivisions.viewLabel')}
      appearance={theme.appearance.colorScheme}
      tintColor={theme.color.accent}
      backgroundColor={theme.color.background}
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
