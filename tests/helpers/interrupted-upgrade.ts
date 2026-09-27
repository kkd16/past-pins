import { Database } from 'bun:sqlite';
import { createDocumentCodec } from '../../src/data/document';
import { validateV1, type AppDataV1 } from '../../src/data/schemas/v1';
import { createSnapshotStorage } from '../../src/storage/snapshot-storage';

const [databasePath, phase] = process.argv.slice(2);
const database = new Database(databasePath);
const write = database.query('INSERT INTO kv (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
const pause = async (message: string) => {
  process.stdout.write(message);
  setInterval(() => {}, 60_000);
  await new Promise(() => {});
};
const codec = createDocumentCodec<AppDataV1>([
  { version: 1, validate: validateV1 },
  { version: 2, validate: validateV1, upgrade(value) {
    const data = validateV1(value);
    data.preferences.haptics = false;
    return data;
  } },
]);
const storage = createSnapshotStorage({
  async getItem(key) { return database.query<{ value: string }, [string]>('SELECT value FROM kv WHERE key=?').get(key)?.value ?? null; },
  async setItem(key, value) { write.run(key, value); },
  async multiSet(entries) {
    database.exec('BEGIN IMMEDIATE');
    for (const [index, [key, value]] of entries.entries()) {
      write.run(key, value);
      if (phase === 'before' && index === 0) await pause('before');
    }
    database.exec('COMMIT');
  },
  async clear() { database.exec('DELETE FROM kv'); },
}, codec);
await storage.load();
await pause('after');
