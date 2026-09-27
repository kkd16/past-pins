import { Database } from 'bun:sqlite';
import { createSnapshotStorage } from '../../src/storage/snapshot-storage';

const [databasePath, phase] = process.argv.slice(2);
const database = new Database(databasePath);
const write = database.query('INSERT INTO kv (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
const pause = async (message: string) => {
  process.stdout.write(message);
  setInterval(() => {}, 60_000);
  await new Promise(() => {});
};
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
});
const data = await storage.load();
data.preferences.haptics = false;
await storage.save(data, { checkpoints: 'create' });
await pause('after');
