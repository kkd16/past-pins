export type ToastOptions = {
  message: string;
  action?: { label: string; onPress: () => void | boolean };
  onDismiss?: () => void;
};

export type ToastSnapshot = ToastOptions & { id: number; visible: boolean };

export function createToastStore() {
  let snapshot: ToastSnapshot | null = null;
  let sequence = 0;
  const listeners = new Set<() => void>();

  function publish(next: ToastSnapshot | null) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  function dismissToast(id: number) {
    if (snapshot?.id !== id || !snapshot.visible) return;
    const toast = snapshot;
    publish({ ...toast, visible: false });
    toast.onDismiss?.();
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    showToast(options: ToastOptions) {
      const previous = snapshot;
      const id = ++sequence;
      publish({ ...options, id, visible: true });
      if (previous?.visible) previous.onDismiss?.();
      return () => dismissToast(id);
    },
    dismissToast,
    removeToast(id: number) {
      if (snapshot?.id === id && !snapshot.visible) publish(null);
    },
    pressAction(id: number) {
      if (snapshot?.id !== id || !snapshot.visible || !snapshot.action) return;
      // A temporarily unavailable action can keep its toast open.
      if (snapshot.action.onPress() !== false) dismissToast(id);
    },
  };
}
