import { useLayoutEffect, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppText } from '../components/AppText';
import { ChoiceRow } from '../components/ChoiceRow';
import { theme } from '../theme';
import { countryScopes, type CountryScope } from './filters';

export function CountryScopeControl({
  value,
  onChange,
}: {
  value: CountryScope;
  onChange: (value: CountryScope) => void;
}) {
  const { fontScale } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const positions = useRef<Partial<Record<CountryScope, number>>>({});
  useLayoutEffect(() => {
    scroll.current?.scrollTo({
      x: positions.current[value] ?? 0,
      animated: false,
    });
  }, [value, fontScale]);
  if (fontScale > theme.accessibility.largeTextScale) {
    return (
      <View accessibilityRole="radiogroup" accessibilityLabel="Places to show">
        {countryScopes.map((option) => (
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
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.options}
      accessibilityRole="tablist"
      accessibilityLabel="Places to show"
    >
      {countryScopes.map((option) => (
        <Pressable
          key={option.value}
          onLayout={({ nativeEvent: { layout } }) => {
            positions.current[option.value] = layout.x;
            if (value === option.value)
              scroll.current?.scrollTo({ x: layout.x, animated: false });
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === option.value }}
          onPress={() => onChange(option.value)}
          style={({ pressed }) => [
            styles.option,
            value === option.value && styles.selected,
            pressed && styles.pressed,
          ]}
        >
          <AppText
            variant="label"
            tone={value === option.value ? 'accent' : 'muted'}
          >
            {option.label}
          </AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  options: { gap: theme.space.xs },
  option: {
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
  },
  selected: { backgroundColor: theme.color.selectedSurface },
  pressed: { opacity: theme.opacity.pressed },
});
