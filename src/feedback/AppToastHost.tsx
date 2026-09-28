import { useSyncExternalStore } from 'react';
import { KeyboardAvoidingView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';

import { theme } from '../theme';
import { Toast } from './Toast';
import { useToast } from './ToastProvider';

export function AppToastHost() {
  const store = useToast();
  const toast = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return (
    <FullWindowOverlay unstable_accessibilityContainerViewIsModal={false}>
      <KeyboardAvoidingView
        behavior="padding"
        pointerEvents="box-none"
        style={styles.overlay}
      >
        <SafeAreaView
          edges={['bottom', 'left', 'right']}
          pointerEvents="box-none"
          style={styles.content}
        >
          {toast && (
            <Toast
              key={toast.id}
              toast={toast}
              onDismiss={() => store.dismissToast(toast.id)}
              onRemove={() => store.removeToast(toast.id)}
            />
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </FullWindowOverlay>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
  content: { paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md },
});
