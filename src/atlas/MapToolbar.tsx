import { StyleSheet, View } from 'react-native';

import { ChoiceControl } from '../components/ChoiceControl';
import { IconButton } from '../components/IconButton';
import type { Preferences } from '../data/model';
import { t } from '../localization';
import { theme } from '../theme';

export function MapToolbar({
  mode,
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
        <ChoiceControl
          value={mode}
          options={modes}
          disabled={disabled}
          onChange={onChangeMode}
          accessibilityLabel={t('atlas.mapView')}
          style={styles.mode}
        />
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
            disabled={disabled}
            onPress={onNorth}
            style={styles.control}
          />
        )}
        <IconButton
          name="reset"
          accessibilityLabel={
            mode === 'globe' ? t('atlas.resetGlobe') : t('atlas.fitWorld')
          }
          disabled={disabled}
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
  mode: { ...theme.surface.panel, flexGrow: 1, flexShrink: 1, minWidth: 140 },
  actions: { flexDirection: 'row', gap: theme.space.sm, alignSelf: 'flex-end' },
  control: { ...theme.surface.floating, borderRadius: theme.radius.pill },
});
