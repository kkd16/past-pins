import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import notices from '../../licenses/map-and-controls.json';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { theme } from '../theme';

export function MapAttribution() {
  const [showNotices, setShowNotices] = useState(false);
  return (
    <View style={styles.container}>
      <AppText variant="caption" tone="muted">
        Places include countries and territories in this map’s catalog.
      </AppText>
      <Link href="https://github.com/rembish/iso-topojson" style={styles.link}>
        <AppText variant="caption" tone="muted">
          Map © Alex Rembish · Natural Earth data
        </AppText>
      </Link>
      <Link
        href="https://creativecommons.org/licenses/by/4.0/"
        style={styles.link}
      >
        <AppText variant="caption" tone="muted">
          CC BY 4.0 · Globe geometry and styling by PastPins
        </AppText>
      </Link>
      <Link href="https://github.com/annexare/Countries" style={styles.link}>
        <AppText variant="caption" tone="muted">
          Continents · Countries by Annexare
        </AppText>
      </Link>
      <Button
        label={showNotices ? 'Hide license notices' : 'License notices'}
        variant="quiet"
        accessibilityState={{ expanded: showNotices }}
        onPress={() => setShowNotices((shown) => !shown)}
      />
      {showNotices &&
        notices.map(({ name, text }) => (
          <View key={name} style={styles.notice}>
            <AppText variant="label" accessibilityRole="header">
              {name}
            </AppText>
            <AppText variant="caption" tone="muted">
              {text}
            </AppText>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { gap: theme.space.sm, paddingVertical: theme.space.md },
  container: { paddingVertical: theme.space.lg, gap: theme.space.sm },
  link: {
    paddingVertical: theme.space.md,
    textDecorationLine: 'underline',
    color: theme.color.textMuted,
  },
});
