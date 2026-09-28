import { Database } from 'bun:sqlite';
import { createDocumentStorage } from '../../src/storage/document-storage';

const [databasePath, phase] = process.argv.slice(2);
const database = new Database(databasePath);
const write = database.query('INSERT INTO kv (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
const pause = async (message: string) => {
  process.stdout.write(message);
  setInterval(() => {}, 60_000);
  await new Promise(() => {});
};
const storage = createDocumentStorage({
  async getItem(key) { return database.query<{ value: string }, [string]>('SELECT value FROM kv WHERE key=?').get(key)?.value ?? null; },
  async setItem(key, value) {
    database.exec('BEGIN IMMEDIATE');
    write.run(key, value);
    if (phase === 'before') await pause('before');
    database.exec('COMMIT');
  },
  async clear() { database.exec('DELETE FROM kv'); },
});
const data = await storage.load();
data.preferences.haptics = false;
await storage.save(data);
await pause('after');
