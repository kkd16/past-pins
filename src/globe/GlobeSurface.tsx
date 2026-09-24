import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useCallback, useLayoutEffect, useRef } from 'react';

import type { GlobeController } from './controller';
import { createGlobeRenderer } from './renderer';

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
    return () => {
      mounted.current = false;
      controller.detach();
    };
  }, [controller]);

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
