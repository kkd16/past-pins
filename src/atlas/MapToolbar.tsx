import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { StyleSheet, View } from 'react-native';

import { Button } from '../components/Button';
import { ChoiceRow } from '../components/ChoiceRow';
import { IconButton } from '../components/IconButton';
import { Surface } from '../components/Surface';
import type { Preferences } from '../data/model';
import { language, t } from '../localization';
import { theme } from '../theme';

export function MapToolbar({
  mode,
  largeText,
  disabled,
  onChangeMode,
  onSearch,
  onMore,
  locating,
  onReset,
}: {
  mode: Preferences['mapView'];
  largeText: boolean;
  disabled: boolean;
  onChangeMode: (mode: Preferences['mapView']) => void;
  onSearch: () => void;
  onMore: () => void;
  locating: boolean;
  onReset: () => void;
}) {
  const modes = [
    { value: 'globe', label: t('atlas.globe') },
    { value: 'map', label: t('common.map') },
  ] as const;

  return (
    <View style={styles.content}>
      <View style={styles.toolbar}>
        <Surface variant="floating" style={styles.mode}>
          {largeText ? (
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={t('atlas.mapView')}
              accessibilityLanguage={language}
            >
              {modes.map(({ value, label }) => (
                <ChoiceRow
                  key={value}
                  label={label}
                  selected={mode === value}
                  disabled={disabled}
                  onPress={() => onChangeMode(value)}
                />
              ))}
            </View>
          ) : (
            <SegmentedControl
              style={styles.segments}
              values={modes.map(({ label }) => label)}
              accessibilityLabel={t('atlas.mapView')}
              accessibilityLanguage={language}
              selectedIndex={modes.findIndex(({ value }) => value === mode)}
              enabled={!disabled}
              appearance={theme.appearance.colorScheme}
              tintColor={theme.color.accent}
              backgroundColor={theme.color.surface}
              fontStyle={{ color: theme.color.textMuted }}
              activeFontStyle={{ color: theme.color.onAccent }}
              onChange={({ nativeEvent }) =>
                onChangeMode(modes[nativeEvent.selectedSegmentIndex].value)
              }
            />
          )}
        </Surface>
        <IconButton
          name="search"
          accessibilityLabel={t('places.searchTitle')}
          onPress={onSearch}
          style={styles.control}
        />
        <Button
          label={locating ? t('location.locating') : t('common.more')}
          variant="quiet"
          onPress={onMore}
          accessibilityLabel={t('atlas.mapOptions')}
          accessibilityState={{ busy: locating }}
          style={styles.more}
        />
      </View>
      <View style={styles.actions}>
        <IconButton
          name="reset"
          accessibilityLabel={
            mode === 'globe' ? t('atlas.resetGlobe') : t('atlas.fitWorld')
          }
          onPress={onReset}
          style={styles.control}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.space.sm },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  mode: { flexGrow: 1, flexShrink: 1, minWidth: 140, padding: theme.space.xs },
  segments: { height: theme.size.touch },
  actions: { flexDirection: 'row', gap: theme.space.sm, alignSelf: 'flex-end' },
  control: { ...theme.surface.floating, borderRadius: theme.radius.pill },
  more: { ...theme.surface.floating, paddingHorizontal: theme.space.md },
});
