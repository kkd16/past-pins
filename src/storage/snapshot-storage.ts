import { validateAppData } from '../data/validation';
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

export function createSnapshotStorage(storage: KeyValueStorage): AppStorage {
  let queue = Promise.resolve();
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  return {
    clear() {
      return enqueue(() => storage.clear());
    },
    load() {
      return enqueue(async () => {
        const text = await storage.getItem('app-data');
        return text === null
          ? defaultAppData()
          : validateAppData(JSON.parse(text));
      });
    },
    async save(data) {
      const text = JSON.stringify(validateAppData(data));
      await enqueue(() => storage.setItem('app-data', text));
    },
  };
}
