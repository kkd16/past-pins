import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { StyleSheet, View } from 'react-native';

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
  onShare,
  onLocation,
  locating,
  onNorth,
  onReset,
}: {
  mode: Preferences['mapView'];
  largeText: boolean;
  disabled: boolean;
  onChangeMode: (mode: Preferences['mapView']) => void;
  onSearch: () => void;
  onShare: () => void;
  onLocation: () => void;
  locating: boolean;
  onNorth: () => void;
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
      </View>
      <View style={styles.actions}>
        <IconButton
          name="share"
          accessibilityLabel={t('sharing.worldAction')}
          disabled={disabled}
          onPress={onShare}
          style={styles.control}
        />
        <IconButton
          name="location"
          accessibilityLabel={
            locating ? t('location.locating') : t('location.goToLocation')
          }
          accessibilityState={{ busy: locating }}
          disabled={disabled || locating}
          onPress={onLocation}
          style={styles.control}
        />
        {mode === 'globe' && (
          <IconButton
            name="north"
            accessibilityLabel={t('atlas.northUp')}
            onPress={onNorth}
            style={styles.control}
          />
        )}
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
});
