import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo } from 'react-native';

const ReducedMotionContext = createContext(true);

export function ReducedMotionProvider({ children }: { children: ReactNode }) {
  // Keep motion off until the device preference is known.
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let pendingInitialRead = true;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        pendingInitialRead = false;
        setReduced(enabled);
      },
    );
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (pendingInitialRead) setReduced(enabled);
      })
      .catch(() => undefined);
    return () => {
      pendingInitialRead = false;
      subscription.remove();
    };
  }, []);
  return (
    <ReducedMotionContext.Provider value={reduced}>
      {children}
    </ReducedMotionContext.Provider>
  );
}

export function useReducedMotion() {
  return useContext(ReducedMotionContext);
}
