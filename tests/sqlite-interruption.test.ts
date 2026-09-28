import { Database } from 'bun:sqlite';
import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { encodeDocument } from '../src/data/document';
import { defaultAppData } from '../src/data/model';
import { createDocumentStorage } from '../src/storage/document-storage';

for (const journal of ['DELETE', 'WAL']) {
  test.each(['before', 'after'] as const)(`interrupted ${journal} restore %s commit reopens with one complete document`, async (phase) => {
    const directory = await mkdtemp(join(tmpdir(), 'past-pins-sqlite-'));
    const path = join(directory, 'app.db');
    let database = new Database(path);
    let child: ReturnType<typeof Bun.spawn> | undefined;
    try {
      database.exec(`PRAGMA journal_mode=${journal}`);
      database.exec('CREATE TABLE kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
      const data = defaultAppData();
      data.places.ca = 'visited';
      const original = encodeDocument(data);
      database.query('INSERT INTO kv (key,value) VALUES (?,?)').run('app-data', original);
      database.close();
      child = Bun.spawn([
        process.execPath, '--preload', join(import.meta.dir, 'setup.ts'),
        join(import.meta.dir, 'helpers/interrupted-restore.ts'), path, phase,
      ], { stdout: 'pipe', stderr: 'pipe' });
      const reader = (child.stdout as ReadableStream<Uint8Array>).getReader();
      const signal = await reader.read();
      expect(new TextDecoder().decode(signal.value)).toBe(phase);
      child.kill('SIGKILL');
      await child.exited;
      database = new Database(path);
      const get = (key: string) => database.query<{ value: string }, [string]>('SELECT value FROM kv WHERE key=?').get(key)?.value ?? null;
      const primary = get('app-data')!;
      expect(JSON.parse(primary).schemaVersion).toBe(1);
      if (phase === 'before') {
        expect(primary).toBe(original);
      } else {
        expect(JSON.parse(primary).data.preferences.haptics).toBe(false);
      }
      const storage = createDocumentStorage({
        async getItem(key) { return get(key); },
        async setItem(key, value) { database.query('INSERT OR REPLACE INTO kv VALUES (?,?)').run(key, value); },
        async clear() { database.exec('DELETE FROM kv'); },
      });
      expect((await storage.load()).preferences.haptics).toBe(phase === 'before');
      const stable = await storage.readRaw();
      await storage.load();
      expect(await storage.readRaw()).toBe(stable);
      if (phase === 'before') {
        const restored = await storage.load();
        restored.preferences.haptics = false;
        await storage.save(restored);
      }
      expect((await storage.load()).preferences.haptics).toBe(false);
      expect(database.query('SELECT key FROM kv').all()).toEqual([{ key: 'app-data' }]);
    } finally {
      child?.kill('SIGKILL');
      if (child) await child.exited;
      database.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
}
