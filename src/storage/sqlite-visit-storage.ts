import type { CountryId } from '../countries/types';
import type { VisitStorage } from '../countries/visit-storage';

// The subset of Expo SQLite used here also lets tests execute the SQL with Bun.
type VisitTransaction = {
  runAsync(sql: string, params: string[]): Promise<unknown>;
};

export type VisitDatabase = {
  execAsync(sql: string): Promise<void>;
  getAllAsync<T>(sql: string): Promise<T[]>;
  withExclusiveTransactionAsync(
    task: (transaction: VisitTransaction) => Promise<void>,
  ): Promise<void>;
  closeAsync(): Promise<void>;
};

export function createSQLiteVisitStorage(
  openDatabase: () => Promise<VisitDatabase>,
  knownIds: ReadonlySet<CountryId>,
): VisitStorage {
  let database: VisitDatabase | undefined;
  let queue = Promise.resolve();

  // Initialization, reads, and writes share one queue, including after failures.
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    queue = result.then(() => undefined, () => undefined);
    return result;
  }

  async function getDatabase(): Promise<VisitDatabase> {
    if (database) return database;
    const opened = await openDatabase();
    try {
      await opened.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS visited_countries (
          country_id TEXT PRIMARY KEY NOT NULL
        );
      `);
    } catch (error) {
      // Preserve the initialization error even if releasing the handle fails.
      await opened.closeAsync().catch(() => undefined);
      throw error;
    }
    database = opened;
    return database;
  }

  return {
    load() {
      return enqueue(async () => {
        const db = await getDatabase();
        const rows = await db.getAllAsync<{ country_id: string }>(
          'SELECT country_id FROM visited_countries',
        );
        if (rows.some(({ country_id }) => !knownIds.has(country_id))) {
          throw new Error('Saved visits contain an unknown country ID.');
        }
        return new Set(rows.map(({ country_id }) => country_id));
      });
    },
    async save(visitedIds) {
      // Snapshot before any await so later changes cannot alter a queued save.
      const ids = [...visitedIds];
      if (ids.some((id) => !knownIds.has(id))) {
        throw new Error('Cannot save an unknown country ID.');
      }
      return enqueue(async () => {
        const db = await getDatabase();
        await db.withExclusiveTransactionAsync(async (transaction) => {
          await transaction.runAsync('DELETE FROM visited_countries', []);
          if (ids.length) {
            const placeholders = ids.map(() => '(?)').join(', ');
            await transaction.runAsync(
              `INSERT INTO visited_countries (country_id) VALUES ${placeholders}`,
              ids,
            );
          }
        });
      });
    },
  };
}
