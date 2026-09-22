import {
  KeyboardAvoidingView,
  StyleSheet,
  View,
  type ViewProps,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../theme';

export function Screen({ style, ...props }: ViewProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={insets.top}
      >
        <View {...props} style={[styles.content, style]} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.background },
  flex: { flex: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: theme.size.contentMax,
    alignSelf: 'center',
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.sm,
  },
});
