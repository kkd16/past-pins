import { describe, expect, test } from 'bun:test';

import { countryIds } from '../src/countries/catalog';
import { decodeBackup, encodeBackup } from '../src/data/backup';
import { createDocumentCodec, documentCodec, type Schema } from '../src/data/document';
import { defaultV1Data, validateV1 } from '../src/data/schemas/v1';
import ids from '../src/data/schemas/v1-ids.json';
import { subdivisionIds } from '../src/subdivisions/catalog';
import empty from './fixtures/data/v1-empty.json';
import populated from './fixtures/data/v1-populated.json';

const v1: Schema = { version: 1, validate(value) {
  if (typeof value !== 'number') throw new Error('Expected number');
  return value;
} };
const v2: Schema = { version: 2, upgrade: (value) => ({ count: value }), validate(value) {
  if (!value || typeof value !== 'object' || !('count' in value) || typeof value.count !== 'number') throw new Error('Expected count');
  return { count: value.count };
} };
const v3: Schema = { version: 3, upgrade: (value) => `Count: ${(value as { count: number }).count}`, validate(value) {
  if (typeof value !== 'string') throw new Error('Expected string');
  return value;
} };
const document = (schemaVersion: number, data: unknown) => JSON.stringify({ app: 'past-pins', schemaVersion, data });

describe('released data contracts', () => {
  test('v1 defaults and populated fixtures remain readable by the production import path', () => {
    expect<unknown>(defaultV1Data()).toEqual(empty.data);
    for (const fixture of [empty, populated]) {
      const original = JSON.stringify(fixture);
      const loaded = decodeBackup(original);
      expect<unknown>(loaded).toEqual(fixture.data);
      expect(decodeBackup(encodeBackup(loaded))).toEqual(loaded);
      expect(JSON.stringify(fixture)).toBe(original);
    }
    expect(validateV1(populated.data).lists[0].name).toBe('Québec & 日本 🗺');
  });

  test('catalog changes require an explicit schema and saved-ID migration decision', () => {
    expect([...countryIds].sort()).toEqual(ids.countries);
    expect([...subdivisionIds].sort()).toEqual(ids.subdivisions);
  });

  test('v1 rejects prototypes and newer documents without inventing defaults', () => {
    for (const value of [empty.data, { ...empty, schemaVersion: undefined, version: 1 }]) {
      expect(() => documentCodec.decode(JSON.stringify(value))).toThrow('invalid-document');
    }
    expect(() => documentCodec.decode(document(2, {}))).toThrow('unsupported-version');
  });
});

describe('forward migration engine', () => {
  test('runs every intermediate step for skipped releases and validates source and destination', () => {
    const codec = createDocumentCodec<string>([v1, v2, v3]);
    expect(codec.decode(document(1, 7))).toEqual({ sourceVersion: 1, migrated: true, data: 'Count: 7' });
    expect(codec.decode(document(2, { count: 9 })).data).toBe('Count: 9');
    const latest = codec.decode(JSON.stringify(codec.encode('Count: 7')));
    expect(latest).toEqual({ sourceVersion: 3, migrated: false, data: 'Count: 7' });
    expect(() => codec.decode(document(1, 'bad'))).toThrow('invalid-document');
    expect(() => codec.decode(document(2, {}))).toThrow('invalid-document');
  });

  test('refuses missing, reordered, or duplicate steps at construction', () => {
    for (const registry of [[], [v2], [v1, v3], [v1, v1], [v1, { ...v2, upgrade: undefined }], [{ ...v1, upgrade: () => 1 }]]) {
      expect(() => createDocumentCodec(registry)).toThrow('consecutive');
    }
  });

  test('distinguishes a thrown migration from invalid upgraded data and future versions safely', () => {
    for (const upgrade of [() => { throw new Error('private payload'); }, () => ({ count: 'invalid' })]) {
      const codec = createDocumentCodec([v1, { ...v2, upgrade }]);
      expect(() => codec.decode(document(1, 1))).toThrow('migration-failed');
      expect(() => codec.decode(document(4, {}))).toThrow('unsupported-version');
    }
  });
});
