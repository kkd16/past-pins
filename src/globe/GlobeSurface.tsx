import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useCallback, useLayoutEffect, useRef } from 'react';

import type { GlobeController } from './controller';
import { createGlobeRenderer } from './renderer';

// Keep GPU resource ownership tied to the native surface, including retries.
export function GlobeSurface({
  controller,
  onError,
}: {
  controller: GlobeController;
  onError: (error: unknown) => void;
}) {
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    const timeout = setTimeout(() => {
      if (!controller.ready)
        onError(new Error('Globe initialization timed out.'));
    }, 10000);
    return () => {
      mounted.current = false;
      clearTimeout(timeout);
      controller.detach();
    };
  }, [controller, onError]);

  const createContext = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      if (!mounted.current) return;
      try {
        controller.attach(createGlobeRenderer(gl));
      } catch (error) {
        onError(error);
      }
    },
    [controller, onError],
  );

  return <GLView style={{ flex: 1 }} onContextCreate={createContext} />;
}
