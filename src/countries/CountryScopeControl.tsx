import { Keyboard, StyleSheet, View } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { t } from '../localization';
import { theme } from '../theme';
import { countryScopes, type CountryScope } from './filters';

export function CountryScopeControl({ value, onChange }: {
  value: CountryScope;
  onChange: (value: CountryScope) => void;
}) {
  return (
    <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel={t('countries.placesToShow')}>
      {countryScopes.map((option) => (
        <AppPressable
          key={option.value}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === option.value }}
          onPress={() => { Keyboard.dismiss(); onChange(option.value); }}
          style={[styles.option, value === option.value && styles.selected]}
        >
          <AppText variant="label" tone={value === option.value ? 'accent' : 'muted'}>{option.label}</AppText>
        </AppPressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  options: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.xs },
  option: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surface,
  },
  selected: { backgroundColor: theme.color.selectedSurface },
});
