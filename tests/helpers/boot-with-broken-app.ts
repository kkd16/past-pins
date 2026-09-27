import assert from 'node:assert/strict';
import { mock } from 'bun:test';

let routerLoaded = false;
let appImported = false;
let task: ((event: { data: { locations: [] } }) => Promise<void>) | undefined;
const recorded: unknown[] = [];
mock.module('expo-task-manager', () => ({
  defineTask(name: string, handler: typeof task) {
    assert.equal(name, 'past-pins-country-arrivals');
    task = handler;
  },
}));
mock.module('expo-router/entry', () => { routerLoaded = true; return {}; });
mock.module('../../src/location/arrival-notifications', () => {
  appImported = true;
  throw new Error('The main application module cannot load');
});
mock.module('../../src/recovery/diagnostics-file', () => ({
  diagnostics: { record(operation: string, error: unknown) { recorded.push({ operation, error }); } },
}));
await import('../../index.js');
assert.equal(routerLoaded, true);
assert.equal(appImported, false);
assert.ok(task);
await task({ data: { locations: [] } });
assert.equal(appImported, true);
assert.equal(recorded.length, 1);
process.stdout.write('boot and task error handled');
