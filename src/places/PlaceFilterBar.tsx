import type { ReactNode } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Icon } from '../components/Icon';
import { t } from '../localization';
import { theme } from '../theme';
import { getLocationLabel, type PlaceLocation } from './location';

export function PlaceFilterBar({ location, onOpenLocation, children }: {
  location: PlaceLocation;
  onOpenLocation: () => void;
  children: ReactNode;
}) {
  const label = getLocationLabel(location);
  return (
    <View style={styles.row}>
      <AppPressable
        accessibilityLabel={t('places.location')}
        accessibilityValue={{ text: label }}
        onPress={() => { Keyboard.dismiss(); onOpenLocation(); }}
        style={styles.location}
      >
        <AppText variant="label" tone={location.kind === 'anywhere' ? 'default' : 'accent'} style={styles.label}>
          {label}
        </AppText>
        <Icon name="chevronDown" size={theme.size.iconSmall} />
      </AppPressable>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  location: { flexGrow: 1, flexShrink: 1, flexBasis: 140, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.space.sm, padding: theme.space.md, borderRadius: theme.radius.sm, backgroundColor: theme.color.surface },
  label: { flexShrink: 1 },
});
