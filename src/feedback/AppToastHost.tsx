import { useEffect, useRef, useSyncExternalStore } from 'react';
import { KeyboardAvoidingView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';

import { appData } from '../data/app-data';
import { useAppData } from '../data/AppData';
import { t } from '../localization';
import { theme } from '../theme';
import { Toast } from './Toast';
import { useToast } from './ToastProvider';

export function AppToastHost() {
  const { undo, discardUndo } = appData;
  const pendingUndo = useAppData((snapshot) => snapshot.pendingUndo);
  const busy = useAppData((snapshot) => snapshot.busy);
  const store = useToast();
  const toast = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const undoId = useRef<number | undefined>(undefined);
  const dismissUndo = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (undoId.current === pendingUndo?.id) return;
    undoId.current = pendingUndo?.id;
    dismissUndo.current?.();
    dismissUndo.current = pendingUndo
      ? store.showToast({
          message: pendingUndo.label,
          action: {
            label: t('common.undo'),
            onPress: () => undo(pendingUndo.id),
          },
          onDismiss: () => discardUndo(pendingUndo.id),
        })
      : undefined;
  }, [pendingUndo, undo, discardUndo, store]);

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
              actionDisabled={busy}
              onDismiss={() => store.dismissToast(toast.id)}
              onRemove={() => store.removeToast(toast.id)}
              onAction={() => store.pressAction(toast.id)}
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
