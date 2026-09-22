import { StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Icon } from '../components/Icon';
import { theme } from '../theme';

export function CountriesHeader() {
  return (
    <View style={styles.header}>
      <View>
        <AppText variant="caption" tone="muted" style={styles.brand}>
          PASTPINS
        </AppText>
        <AppText variant="title">Your world.</AppText>
      </View>
      <View style={styles.brandMark}>
        <Icon name="compass" size={30} color={theme.color.accent} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.xs,
    paddingBottom: theme.space.lg,
  },
  brand: { letterSpacing: 2, marginBottom: theme.space.xs },
  brandMark: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.pill,
  },
});
