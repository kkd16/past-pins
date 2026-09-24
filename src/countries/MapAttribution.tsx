import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { theme } from '../theme';

export function MapAttribution() {
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
          CC BY 4.0 · Projected and styled by PastPins
        </AppText>
      </Link>
      <Link href="https://github.com/annexare/Countries" style={styles.link}>
        <AppText variant="caption" tone="muted">
          Continents · Countries by Annexare
        </AppText>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: theme.space.lg, gap: theme.space.sm },
  link: {
    paddingVertical: theme.space.md,
    textDecorationLine: 'underline',
    color: theme.color.textMuted,
  },
});
