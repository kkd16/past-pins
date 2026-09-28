import { decodeDocument, encodeDocument } from '../data/document';
import { dataError } from '../data/data-error';
import { defaultAppData, type AppData } from '../data/model';

export interface AppStorage {
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
  clear(): Promise<void>;
}

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  clear(): Promise<void>;
}

const DATA_KEY = 'app-data';

export function createDocumentStorage(storage: KeyValueStorage) {
  let queue = Promise.resolve();
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
        return text === null ? defaultAppData() : decodeDocument(text);
      });
    },
    async save(data: AppData) {
      const text = encodeDocument(data);
      await enqueue(() => writeItem(DATA_KEY, text));
    },
    readRaw() {
      return enqueue(() => read(DATA_KEY));
    },
  };
}
