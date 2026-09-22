import { describe, expect, test } from 'bun:test';

import {
  createLocalVisitStorage,
  decodeVisits,
  visitsKey,
} from '../src/storage/local-visit-storage';
import { InvalidVisitsError } from '../src/countries/visit-storage';

const ids = new Set(['ca', 'fr', 'jp']);

describe('saved visits', () => {
  test('starts empty and restores saved IDs', () => {
    expect(decodeVisits(null, ids).size).toBe(0);
    expect(decodeVisits('{"version":1,"visitedIds":["ca","jp"]}', ids)).toEqual(
      new Set(['ca', 'jp']),
    );
  });

  test('rejects unreadable, unknown, and duplicate data instead of erasing it', () => {
    for (const value of [
      'not JSON',
      'null',
      '[]',
      '{}',
      '{"version":2,"visitedIds":[]}',
      '{"version":1,"visitedIds":["xx"]}',
      '{"version":1,"visitedIds":["ca","ca"]}',
      '{"version":1,"visitedIds":[123]}',
      '{"version":1,"visitedIds":"ca"}',
    ]) {
      expect(() => decodeVisits(value, ids)).toThrow(InvalidVisitsError);
    }
  });

  test('serializes rapid changes and persists a snapshot, including unchecking', async () => {
    const writes: string[] = [];
    const started: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const storage = createLocalVisitStorage(
      {
        getItem: async () => null,
        setItem: async (key, value) => {
          expect(key).toBe(visitsKey);
          started.push(value);
          if (!writes.length) await gate;
          writes.push(value);
        },
      },
      ids,
    );
    const selection = new Set(['ca']);
    const first = storage.save(selection);
    selection.add('fr');
    const second = storage.save(selection);
    selection.delete('ca');
    const third = storage.save(selection);
    await Promise.resolve();
    expect(started).toHaveLength(1);
    expect(writes).toHaveLength(0);
    release();
    await Promise.all([first, second, third]);
    expect(writes.map((value) => JSON.parse(value).visitedIds)).toEqual([
      ['ca'],
      ['ca', 'fr'],
      ['fr'],
    ]);
  });

  test('exposes failures and lets the next save retry the latest selection', async () => {
    let attempts = 0;
    let saved: string | null = null;
    const storage = createLocalVisitStorage(
      {
        getItem: async () => saved,
        setItem: async (_, value) => {
          if (++attempts === 1) throw new Error('Storage unavailable');
          saved = value;
        },
      },
      ids,
    );
    await expect(storage.save(new Set(['ca']))).rejects.toThrow(
      'Storage unavailable',
    );
    await storage.save(new Set(['ca', 'fr']));
    expect(await storage.load()).toEqual(new Set(['ca', 'fr']));
  });

  test('loads existing v1 data without rewriting it and resets only on an explicit save', async () => {
    let saved = '{"version":1,"visitedIds":["jp","ca"]}';
    const writes: string[] = [];
    const storage = createLocalVisitStorage(
      {
        getItem: async (key) => {
          expect(key).toBe('past-pins.visits.v1');
          return saved;
        },
        setItem: async (_, value) => {
          writes.push(value);
          saved = value;
        },
      },
      ids,
    );

    expect(await storage.load()).toEqual(new Set(['jp', 'ca']));
    expect(writes).toEqual([]);

    saved = 'unreadable data';
    await expect(storage.load()).rejects.toThrow(InvalidVisitsError);
    expect(saved).toBe('unreadable data');
    expect(writes).toEqual([]);

    await storage.save(new Set());
    expect(saved).toBe('{"version":1,"visitedIds":[]}');
    expect(await storage.load()).toEqual(new Set());
  });

  test('propagates read failures without making them resettable or writing data', async () => {
    const failure = new Error('Storage unavailable');
    const writes: string[] = [];
    const storage = createLocalVisitStorage(
      {
        getItem: async () => {
          throw failure;
        },
        setItem: async (_, value) => {
          writes.push(value);
        },
      },
      ids,
    );

    await expect(storage.load()).rejects.toBe(failure);
    expect(failure).not.toBeInstanceOf(InvalidVisitsError);
    expect(writes).toEqual([]);
  });

  test('rejects invalid saves through the async contract without blocking valid saves', async () => {
    const writes: string[] = [];
    const storage = createLocalVisitStorage(
      {
        getItem: async () => null,
        setItem: async (_, value) => {
          writes.push(value);
        },
      },
      ids,
    );

    await expect(storage.save(new Set(['unknown']))).rejects.toThrow(
      'Cannot save an unknown country ID.',
    );
    expect(writes).toEqual([]);
    await storage.save(new Set(['jp', 'ca']));
    expect(writes).toEqual(['{"version":1,"visitedIds":["ca","jp"]}']);
  });
});
