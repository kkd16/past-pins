import { createContext, useContext, useState, type ReactNode } from 'react';

import { createToastStore } from './store';

const ToastContext = createContext<ReturnType<typeof createToastStore> | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createToastStore);
  return <ToastContext.Provider value={store}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used within ToastProvider.');
  return value;
}
