import { expect, mock } from 'bun:test';
import { join } from 'node:path';
import { act, createElement } from 'react';
import { createRoot } from 'test-renderer';
import type { SQLiteDatabase } from 'expo-sqlite';

import { searchCities, useCityCatalogStatus } from '../../src/cities/database';
import ownedFiles from '../../src/storage/owned-files.json';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const files = new Set<string>();
const events: string[] = [];
let deletionFails = false;
const initialize = Promise.withResolvers<void>();
const scenario = process.argv[2];
type Connection = { database: SQLiteDatabase; close: ReturnType<typeof mock>; failQueries: boolean };
const connections: Connection[] = [];

mock.module('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  Directory: class {
    uri: string;
    constructor(...paths: string[]) { this.uri = paths.join('/'); }
  },
  File: class {
    uri: string;
    constructor(...paths: string[]) { this.uri = paths.join('/'); }
    get exists() { return files.has(this.uri); }
    delete() {
      if (deletionFails) throw new Error('Cache deletion failed.');
      events.push('delete');
      files.delete(this.uri);
    }
  },
}));
mock.module('expo-asset', () => ({ Asset: { fromModule: () => ({ downloadAsync: async () => ({ localUri: 'file:///asset.db' }) }) } }));
mock.module('../../src/cities/catalog.db', () => ({ default: 1 }));
mock.module(join(import.meta.dir, '../../node_modules/expo-sqlite/src/ExpoSQLite.ts'), () => ({
  default: {
    importAssetDatabaseAsync: async (path: string, _asset: string, overwrite: boolean) => {
      expect(path).toStartWith(`file:///cache/${ownedFiles.catalogDirectory}/`);
      expect(overwrite).toBe(false);
      if (!files.has(path)) events.push('copy');
      files.add(path);
    },
  },
}));
mock.module(join(import.meta.dir, '../../node_modules/expo-sqlite/src/SQLiteDatabase.ts'), () => ({
  openDatabaseAsync: async () => {
    const close = mock(async () => { events.push('close'); });
    const connection = { close, failQueries: false } as Connection;
    const first = connections.length === 0;
    connection.database = {
      execAsync: async () => {},
      getFirstAsync: async () => {
        if (first && (scenario === 'late-initialization' || scenario === 'unmount')) await initialize.promise;
        return { geonameId: 6167865 };
      },
      getAllAsync: async () => {
        if (connection.failQueries) throw new Error('City query failed.');
        return [];
      },
      closeAsync: close,
    } as unknown as SQLiteDatabase;
    connections.push(connection);
    return connection.database;
  },
}));
const sqlite = await import('../../node_modules/expo-sqlite/src/hooks');
mock.module('expo-sqlite', () => sqlite);
const { CityCatalogLoader } = await import('../../src/cities/CityCatalogLoader');
const root = createRoot();
function Probe() { return createElement('CatalogStatus', useCityCatalogStatus()); }
function status() {
  const [node] = root.container.queryAll((item) => item.type === 'CatalogStatus');
  return node.props as ReturnType<typeof useCityCatalogStatus>;
}

await act(async () => root.render(<><CityCatalogLoader /><Probe /></>));
expect(connections).toHaveLength(1);
expect(events).toEqual(['copy']);
if (scenario === 'unmount') {
  await act(async () => root.unmount());
  await act(async () => initialize.resolve());
  expect(connections[0].close).toHaveBeenCalledTimes(1);
  await expect(searchCities({ query: '' })).rejects.toThrow('City catalog unavailable');
} else {
  if (scenario === 'late-initialization') {
    expect(status()).toMatchObject({ ready: false, error: false });
  } else {
    expect(status()).toMatchObject({ ready: true, error: false });
    connections[0].failQueries = true;
    await act(async () => {
      await expect(searchCities({ query: 'Toronto' })).rejects.toThrow('City query failed');
    });
    expect(status()).toMatchObject({ ready: false, error: true });
  }
  if (scenario === 'delete-failure') {
    deletionFails = true;
    await act(async () => status().retry());
    expect(status()).toMatchObject({ ready: false, error: true });
    expect(connections).toHaveLength(1);
    deletionFails = false;
  }
  await act(async () => status().retry());
  expect(connections).toHaveLength(2);
  expect(events.filter((event) => event !== 'close')).toEqual(['copy', 'delete', 'copy']);
  expect(status()).toMatchObject({ ready: true, error: false });
  if (scenario === 'late-initialization') await act(async () => initialize.resolve());
  expect(connections[0].close).toHaveBeenCalledTimes(1);
  expect(status()).toMatchObject({ ready: true, error: false });
  expect(await searchCities({ query: '' })).toEqual([]);
  await act(async () => root.unmount());
  expect(connections[1].close).toHaveBeenCalledTimes(1);
}
process.stdout.write('passed');
