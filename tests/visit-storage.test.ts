import { Database } from 'bun:sqlite';
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { countryIds } from '../src/countries/catalog';
import {
  createSQLiteVisitStorage,
  type VisitDatabase,
} from '../src/storage/sqlite-visit-storage';

const ids = new Set(['ca', 'fr', 'jp']);
const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

function temporaryDatabasePath() {
  const directory = mkdtempSync(join(tmpdir(), 'past-pins-test-'));
  cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
  return join(directory, 'visits.db');
}

// Executes real SQL, but does not emulate Expo's native bridge.
function openTestDatabase(path: string) {
  const sql = new Database(path);
  let closed = false;
  function close() {
    if (closed) return;
    sql.close();
    closed = true;
  }
  cleanups.push(close);
  const database: VisitDatabase = {
    async execAsync(source) {
      sql.exec(source);
    },
    async getAllAsync<T>(source: string) {
      return sql.query<T, []>(source).all();
    },
    async withExclusiveTransactionAsync(task) {
      sql.exec('BEGIN IMMEDIATE');
      try {
        await task({
          async runAsync(source, params) {
            return sql.query(source).run(...params);
          },
        });
        sql.exec('COMMIT');
      } catch (error) {
        sql.exec('ROLLBACK');
        throw error;
      }
    },
    async closeAsync() {
      close();
    },
  };
  return { sql, database, close, isClosed: () => closed };
}

function fixture() {
  const connection = openTestDatabase(temporaryDatabasePath());
  const storage = createSQLiteVisitStorage(async () => connection.database, ids);
  return { ...connection, storage };
}

describe('SQLite saved visits', () => {
  test('starts empty, enables WAL, and persists across closing and reopening', async () => {
    const path = temporaryDatabasePath();
    const first = openTestDatabase(path);
    const storage = createSQLiteVisitStorage(async () => first.database, ids);
    expect(await storage.load()).toEqual(new Set());
    expect(first.sql.query('PRAGMA journal_mode').get()).toEqual({
      journal_mode: 'wal',
    });
    await storage.save(new Set(['ca', 'jp']));
    first.close();

    const second = openTestDatabase(path);
    const reopened = createSQLiteVisitStorage(async () => second.database, ids);
    expect(await reopened.load()).toEqual(new Set(['ca', 'jp']));
  });

  test('can save before loading, uncheck countries, and clear the collection', async () => {
    const { storage } = fixture();
    await storage.save(new Set(['ca', 'jp']));
    await storage.save(new Set(['jp']));
    expect(await storage.load()).toEqual(new Set(['jp']));
    await storage.save(new Set());
    expect(await storage.load()).toEqual(new Set());
  });

  test('saves the full country catalog in one snapshot', async () => {
    const { database } = fixture();
    const storage = createSQLiteVisitStorage(async () => database, countryIds);
    await storage.save(countryIds);
    expect(await storage.load()).toEqual(countryIds);
  });

  test('opens lazily once and serializes rapid saves and reads with immutable snapshots', async () => {
    const { database } = fixture();
    const started = Promise.withResolvers<void>();
    const gate = Promise.withResolvers<void>();
    let opens = 0;
    let transactions = 0;
    const transaction = database.withExclusiveTransactionAsync;
    database.withExclusiveTransactionAsync = async (task) => {
      transactions++;
      if (transactions === 1) {
        started.resolve();
        await gate.promise;
      }
      await transaction(task);
    };
    const storage = createSQLiteVisitStorage(async () => {
      opens++;
      return database;
    }, ids);
    expect(opens).toBe(0);
    const selection = new Set(['ca']);
    const first = storage.save(selection);
    const afterFirst = storage.load();
    selection.add('fr');
    const second = storage.save(selection);
    const afterSecond = storage.load();
    selection.delete('ca');
    const third = storage.save(selection);
    const afterThird = storage.load();
    selection.clear();

    await started.promise;
    expect(transactions).toBe(1);
    expect(opens).toBe(1);
    gate.resolve();
    await Promise.all([first, second, third]);
    expect(await afterFirst).toEqual(new Set(['ca']));
    expect(await afterSecond).toEqual(new Set(['ca', 'fr']));
    expect(await afterThird).toEqual(new Set(['fr']));
    expect(opens).toBe(1);
  });

  test('rolls back a failed insert after deletion and permits a later save', async () => {
    const { storage, sql } = fixture();
    await storage.save(new Set(['ca']));
    sql.exec(`
      CREATE TRIGGER fail_visit BEFORE INSERT ON visited_countries
      WHEN NEW.country_id = 'fr'
      BEGIN SELECT RAISE(ABORT, 'injected write failure'); END;
    `);
    await expect(storage.save(new Set(['jp', 'fr']))).rejects.toThrow(
      'injected write failure',
    );
    expect(await storage.load()).toEqual(new Set(['ca']));
    sql.exec('DROP TRIGGER fail_visit');
    await storage.save(new Set(['jp', 'fr']));
    expect(await storage.load()).toEqual(new Set(['jp', 'fr']));
  });

  test('rejects invalid saves without changing data or blocking subsequent saves', async () => {
    const { storage } = fixture();
    await storage.save(new Set(['ca']));
    await expect(storage.save(new Set(['unknown']))).rejects.toThrow('unknown country ID');
    expect(await storage.load()).toEqual(new Set(['ca']));
    await storage.save(new Set(['jp']));
    expect(await storage.load()).toEqual(new Set(['jp']));
  });

  test('rejects unknown stored IDs without removing them', async () => {
    const { storage, sql } = fixture();
    await storage.save(new Set(['ca']));
    sql.query('INSERT INTO visited_countries (country_id) VALUES (?)').run('unknown');
    await expect(storage.load()).rejects.toThrow('unknown country ID');
    expect(sql.query('SELECT country_id FROM visited_countries ORDER BY country_id').all()).toEqual([
      { country_id: 'ca' },
      { country_id: 'unknown' },
    ]);
  });

  test('binds IDs as values instead of interpolating SQL', async () => {
    const { database } = fixture();
    const quotedId = "x'); DROP TABLE visited_countries; --";
    const knownIds = new Set([quotedId]);
    const storage = createSQLiteVisitStorage(async () => database, knownIds);
    await storage.save(knownIds);
    expect(await storage.load()).toEqual(knownIds);
  });

  test('retries opening after an open failure', async () => {
    const { database } = fixture();
    const failure = new Error('Cannot open database');
    let opens = 0;
    const storage = createSQLiteVisitStorage(async () => {
      if (++opens === 1) throw failure;
      return database;
    }, ids);
    await expect(storage.load()).rejects.toBe(failure);
    expect(await storage.load()).toEqual(new Set());
    expect(opens).toBe(2);
  });

  test('closes a failed initialization and retries without erasing saved data', async () => {
    const path = temporaryDatabasePath();
    const initial = openTestDatabase(path);
    await createSQLiteVisitStorage(async () => initial.database, ids).save(new Set(['ca']));
    initial.close();

    const failed = openTestDatabase(path);
    const failure = new Error('Cannot initialize database');
    const initialize = failed.database.execAsync;
    failed.database.execAsync = async (source) => {
      await initialize(source);
      throw failure;
    };
    let opens = 0;
    const storage = createSQLiteVisitStorage(async () => {
      return ++opens === 1 ? failed.database : openTestDatabase(path).database;
    }, ids);
    await expect(storage.load()).rejects.toBe(failure);
    expect(failed.isClosed()).toBe(true);
    expect(await storage.load()).toEqual(new Set(['ca']));
    expect(opens).toBe(2);
  });

  test('propagates read failures and allows retry without rewriting saved data', async () => {
    const { storage, database } = fixture();
    await storage.save(new Set(['ca']));
    const read = database.getAllAsync;
    const failure = new Error('Cannot read database');
    database.getAllAsync = async () => {
      throw failure;
    };
    await expect(storage.load()).rejects.toBe(failure);
    database.getAllAsync = read;
    expect(await storage.load()).toEqual(new Set(['ca']));
  });
});
