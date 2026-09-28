export type ToastSnapshot = {
  id: number;
  message: string;
  visible: boolean;
};

export function createToastStore() {
  let snapshot: ToastSnapshot | null = null;
  let sequence = 0;
  const listeners = new Set<() => void>();

  function publish(next: ToastSnapshot | null) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    showToast({ message }: { message: string }) {
      publish({ message, id: ++sequence, visible: true });
    },
    dismissToast(id: number) {
      if (snapshot?.id === id && snapshot.visible)
        publish({ ...snapshot, visible: false });
    },
    removeToast(id: number) {
      if (snapshot?.id === id && !snapshot.visible) publish(null);
    },
  };
}
