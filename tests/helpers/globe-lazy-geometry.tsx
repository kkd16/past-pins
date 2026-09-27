import assert from 'node:assert/strict';
import { mock } from 'bun:test';
import { act } from 'react';
import { createRoot } from 'test-renderer';
import type { ExpoWebGLRenderingContext } from 'expo-gl';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let geometryLoads = 0;
mock.module('expo-gl', () => ({ GLView: 'GLView' }));
mock.module('../../src/globe/world.json', () => {
  geometryLoads++;
  return { positions: [], indices: [], borders: [], countries: [] };
});

const { GlobeSurface } = await import('../../src/globe/GlobeSurface');
const { GlobeController } = await import('../../src/globe/controller');
assert.equal(geometryLoads, 0, 'Importing a map must not load GPU geometry');
const root = createRoot({ isStrictMode: true });
const error = mock();
const controller = new GlobeController(error);
let created = 0;
let deleted = 0;
const gl = new Proxy({}, {
  get(_target, property) {
    if (property === 'NO_ERROR') return 0;
    if (property === 'getError') return () => 0;
    if (String(property).startsWith('create')) return () => ({ id: ++created });
    if (String(property).startsWith('delete')) return () => { deleted++; };
    if (property === 'getShaderParameter' || property === 'getProgramParameter') return () => true;
    return () => undefined;
  },
}) as ExpoWebGLRenderingContext;

try {
  await act(async () => root.render(<GlobeSurface controller={controller} onError={error} />));
  assert.equal(geometryLoads, 0, 'Mounting the surface must wait for the native GL context');
  const [view] = root.container.queryAll((node) => node.type === 'GLView');
  const createContext = view.props.onContextCreate;
  await act(async () => createContext(gl));
  assert.equal(geometryLoads, 1);
  assert.equal(controller.ready, true);
  assert.equal(error.mock.calls.length, 0);
  const firstResources = created;
  await act(async () => createContext(gl));
  assert.equal(geometryLoads, 1, 'Recreating a context reuses the loaded geometry');
  assert.equal(deleted, firstResources, 'Replacing a context disposes the previous resources');
  await act(async () => root.unmount());
  assert.equal(deleted, created);
  assert.equal(controller.ready, false);
  const beforeLateCallback = created;
  createContext(gl);
  assert.equal(created, beforeLateCallback, 'Late native callbacks cannot recreate an unmounted renderer');
} finally {
  await act(async () => root.unmount());
}
process.stdout.write('passed');
