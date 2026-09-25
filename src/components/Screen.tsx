import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { theme } from '../theme';

export function Screen({ style, ...props }: ViewProps) {
  return (
    <SafeAreaView
      style={styles.safe}
      edges={{ top: true, bottom: true, left: true, right: true }}
    >
      <View {...props} style={[styles.content, style]} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.background },
  content: {
    flex: 1,
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.sm,
  },
});
