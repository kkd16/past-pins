import { Database } from 'bun:sqlite';
import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { encodeBackup } from '../src/data/backup';
import { createDocumentCodec } from '../src/data/document';
import { defaultV1Data, validateV1, type AppDataV1 } from '../src/data/schemas/v1';
import { createSnapshotStorage } from '../src/storage/snapshot-storage';

const codec = createDocumentCodec<AppDataV1>([
  { version: 1, validate: validateV1 },
  { version: 2, validate: validateV1, upgrade(value) {
    const data = validateV1(value);
    data.preferences.haptics = false;
    return data;
  } },
]);

for (const journal of ['DELETE', 'WAL']) {
  test.each(['before', 'after'] as const)(`interrupted ${journal} migration %s commit reopens with a complete record and checkpoint`, async (phase) => {
    const directory = await mkdtemp(join(tmpdir(), 'past-pins-sqlite-'));
    const path = join(directory, 'app.db');
    let database = new Database(path);
    let child: ReturnType<typeof Bun.spawn> | undefined;
    try {
      database.exec(`PRAGMA journal_mode=${journal}`);
      database.exec('CREATE TABLE kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
      const data = defaultV1Data();
      data.places.ca = 'visited';
      const original = encodeBackup(data);
      database.query('INSERT INTO kv (key,value) VALUES (?,?)').run('app-data', original);
      database.close();
      child = Bun.spawn([process.execPath, join(import.meta.dir, 'helpers/interrupted-upgrade.ts'), path, phase], { stdout: 'pipe', stderr: 'pipe' });
      const reader = (child.stdout as ReadableStream<Uint8Array>).getReader();
      const signal = await reader.read();
      expect(new TextDecoder().decode(signal.value)).toBe(phase);
      child.kill('SIGKILL');
      await child.exited;
      database = new Database(path);
      const get = (key: string) => database.query<{ value: string }, [string]>('SELECT value FROM kv WHERE key=?').get(key)?.value ?? null;
      const primary = get('app-data')!;
      expect(JSON.parse(primary).schemaVersion).toBe(phase === 'before' ? 1 : 2);
      if (phase === 'before') {
        expect(primary).toBe(original);
        expect(get('data-checkpoints')).toBeNull();
      } else {
        expect(JSON.parse(primary).data.preferences.haptics).toBe(false);
        expect(JSON.parse(get('data-checkpoints')!)).toMatchObject([{ reason: 'migration', document: original }]);
      }
      const storage = createSnapshotStorage({
        async getItem(key) { return get(key); },
        async setItem(key, value) { database.query('INSERT OR REPLACE INTO kv VALUES (?,?)').run(key, value); },
        async multiSet(entries) { database.transaction(() => {
          for (const [key, value] of entries) database.query('INSERT OR REPLACE INTO kv VALUES (?,?)').run(key, value);
        })(); },
        async clear() { database.exec('DELETE FROM kv'); },
      }, codec);
      expect((await storage.load()).preferences.haptics).toBe(false);
      expect(await storage.listCheckpoints()).toHaveLength(1);
      const stable = get('data-checkpoints');
      await storage.load();
      expect(get('data-checkpoints')).toBe(stable);
    } finally {
      child?.kill('SIGKILL');
      if (child) await child.exited;
      database.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
}
