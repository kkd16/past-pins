import { expect, mock, test } from 'bun:test';

import { DataError } from '../src/data/data-error';
import { createDiagnosticLog } from '../src/recovery/diagnostics';

function fixture(initial: string | null = null) {
  let saved = initial;
  const storage = {
    read: mock(async () => saved),
    write: mock(async (text: string) => { saved = text; }),
    clear: mock(async () => { saved = null; }),
  };
  return { storage, log: createDiagnosticLog(storage, { appVersion: '1.0.0', build: '42' }) };
}

test('diagnostics keep only the last 50 allowlisted events and never save error payloads', async () => {
  const f = fixture();
  for (let source = 1; source <= 55; source++) {
    f.log.record('load', new DataError('unsupported-version', source, { cause: new Error('private list name and coordinates') }));
  }
  const events = await f.log.getEvents();
  const text = JSON.stringify(events);
  expect(events).toHaveLength(50);
  expect(events[0].sourceVersion).toBe(6);
  expect(events[49]).toMatchObject({ operation: 'load', code: 'unsupported-version', sourceVersion: 55, schemaVersion: 1, appVersion: '1.0.0', build: '42' });
  expect(text).not.toContain('private');
  expect(text).not.toContain('cause');
  expect(f.storage.write).toHaveBeenCalledTimes(55);
});

test('reading strips unknown persisted fields and invalid events', async () => {
  const f = fixture(JSON.stringify([
    { timestamp: 1, operation: 'load', code: 'storage-read', schemaVersion: 1, country: 'ca', name: 'private', appVersion: 'private', build: '12' },
    { timestamp: 2, operation: 'private', code: 'unexpected', schemaVersion: 1 },
    null,
  ]));
  const events = await f.log.getEvents();
  expect(events).toEqual([{ timestamp: 1, operation: 'load', code: 'storage-read', schemaVersion: 1, appVersion: null, build: '12' }]);
  expect(JSON.stringify(events)).not.toContain('private');
  events[0].appVersion = 'private';
  events.pop();
  expect(await f.log.getEvents()).toEqual([
    { timestamp: 1, operation: 'load', code: 'storage-read', schemaVersion: 1, appVersion: null, build: '12' },
  ]);
});

test('catalog failures record an allowlisted event without query or place data', async () => {
  const f = fixture();
  f.log.record('catalog', undefined);
  const events = await f.log.getEvents();
  expect(events).toEqual([{
    timestamp: expect.any(Number), appVersion: '1.0.0', build: '42',
    operation: 'catalog', code: 'unexpected', schemaVersion: 1,
  }]);
});

test('diagnostic IO failures do not poison logging, but failed clearing is reported', async () => {
  const f = fixture();
  f.storage.read.mockRejectedValueOnce(new Error('unavailable'));
  f.storage.write.mockRejectedValueOnce(new Error('full'));
  f.log.record('render', new Error('private'));
  f.log.record('save', new DataError('storage-write'));
  expect(await f.log.getEvents()).toHaveLength(2);
  f.storage.clear.mockRejectedValueOnce(new Error('cannot clear'));
  await expect(f.log.clear()).rejects.toThrow('cannot clear');
  await f.log.clear();
  expect(await f.log.getEvents()).toEqual([]);
});

test('reset waits for outstanding diagnostic writes before deleting them', async () => {
  const f = fixture();
  const gate = Promise.withResolvers<void>();
  f.storage.write.mockImplementationOnce(async () => gate.promise);
  f.log.record('save', new DataError('storage-write'));
  const reset = f.log.clear();
  expect(f.storage.clear).not.toHaveBeenCalled();
  gate.resolve();
  await reset;
  expect(f.storage.clear).toHaveBeenCalledTimes(1);
  expect(await f.log.getEvents()).toEqual([]);
});
