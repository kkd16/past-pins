import { documentCodec } from '../data/document';
import { DataError, dataError } from '../data/data-error';
import { defaultAppData, type AppData } from '../data/model';

export type SaveOptions = { checkpoints?: 'create' | 'discard' };
export interface AppStorage {
  load(): Promise<AppData>;
  save(data: AppData, options?: SaveOptions): Promise<void>;
  clear(): Promise<void>;
}

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  multiSet(entries: [string, string][]): Promise<void>;
  clear(): Promise<void>;
}

export type Checkpoint = {
  id: string;
  createdAt: number;
  reason: 'migration' | 'restore';
  document: string;
};
export const DATA_KEY = 'app-data';
export const CHECKPOINTS_KEY = 'data-checkpoints';
const MAX_CHECKPOINTS = 3;

function checkpoints(text: string | null): Checkpoint[] {
  if (text === null) return [];
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new DataError('invalid-document'); }
  if (!Array.isArray(value) || value.length > MAX_CHECKPOINTS || value.some((item) =>
    !item || typeof item !== 'object' || Object.keys(item).length !== 4 ||
    typeof item.id !== 'string' || !/^[a-z0-9-]{1,80}$/.test(item.id) ||
    !Number.isSafeInteger(item.createdAt) || item.createdAt < 0 ||
    !Number.isFinite(new Date(item.createdAt).getTime()) ||
    (item.reason !== 'migration' && item.reason !== 'restore') ||
    typeof item.document !== 'string',
  ) || new Set(value.map((item) => item.id)).size !== value.length
  ) throw new DataError('invalid-document');
  return value;
}

export function createSnapshotStorage(
  storage: KeyValueStorage,
  codec: typeof documentCodec = documentCodec,
) {
  let queue = Promise.resolve();
  let sequence = 0;
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    queue = result.then(() => undefined, () => undefined);
    return result;
  }
  async function read(key: string) {
    try { return await storage.getItem(key); }
    catch (error) { throw dataError(error, 'storage-read'); }
  }
  async function writeItem(key: string, value: string) {
    try { await storage.setItem(key, value); }
    catch (error) { throw dataError(error, 'storage-write'); }
  }
  async function write(entries: [string, string][]) {
    try { await storage.multiSet(entries); }
    catch (error) { throw dataError(error, 'storage-write'); }
  }
  async function replace(text: string, reason: Checkpoint['reason']) {
    const original = await read(DATA_KEY);
    const history = checkpoints(await read(CHECKPOINTS_KEY));
    if (original !== null) {
      const createdAt = Date.now();
      let id: string;
      do { id = `${createdAt.toString(36)}-${++sequence}`; }
      while (history.some((item) => item.id === id));
      history.unshift({ id, createdAt, reason, document: original });
    }
    await write([
      [DATA_KEY, text],
      [CHECKPOINTS_KEY, JSON.stringify(history.slice(0, MAX_CHECKPOINTS))],
    ]);
  }
  return {
    getItem(key: string) {
      return enqueue(() => read(key));
    },
    setItem(key: string, value: string) {
      return enqueue(() => writeItem(key, value));
    },
    clear() {
      return enqueue(async () => {
        try { await storage.clear(); }
        catch (error) { throw dataError(error, 'reset-failed'); }
      });
    },
    load() {
      return enqueue(async () => {
        const text = await read(DATA_KEY);
        if (text === null) {
          if (checkpoints(await read(CHECKPOINTS_KEY)).length) throw new DataError('invalid-document');
          return defaultAppData();
        }
        const result = codec.decode(text);
        if (result.migrated) await replace(JSON.stringify(codec.encode(result.data)), 'migration');
        return result.data;
      });
    },
    async save(data: AppData, options: SaveOptions = {}) {
      const text = JSON.stringify(codec.encode(data));
      await enqueue(async () => {
        if (options.checkpoints === 'discard') {
          await write([[DATA_KEY, text], [CHECKPOINTS_KEY, '[]']]);
        } else if (options.checkpoints === 'create') {
          await replace(text, 'restore');
        } else {
          await writeItem(DATA_KEY, text);
        }
      });
    },
    listCheckpoints() {
      return enqueue(async () => checkpoints(await read(CHECKPOINTS_KEY)));
    },
    readCheckpoint(id: string) {
      return enqueue(async () => {
        const checkpoint = checkpoints(await read(CHECKPOINTS_KEY)).find((item) => item.id === id);
        if (!checkpoint) throw new DataError('invalid-document');
        return codec.decode(checkpoint.document).data;
      });
    },
    readRaw() {
      return enqueue(() => read(DATA_KEY));
    },
  };
}
