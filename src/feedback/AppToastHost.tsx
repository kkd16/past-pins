import { useEffect, useRef, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';

import { useAppData } from '../data/AppDataProvider';
import { t } from '../localization';
import { theme } from '../theme';
import { Toast } from './Toast';
import { useToast } from './ToastProvider';

export function AppToastHost() {
  const { pendingUndo, undo, discardUndo, busy } = useAppData();
  const store = useToast();
  const toast = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const insets = useSafeAreaInsets();
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
      <View
        pointerEvents="box-none"
        style={[
          StyleSheet.absoluteFill,
          {
            paddingTop: insets.top + theme.space.md,
            paddingLeft: insets.left + theme.space.lg,
            paddingRight: insets.right + theme.space.lg,
          },
        ]}
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
      </View>
    </FullWindowOverlay>
  );
}
