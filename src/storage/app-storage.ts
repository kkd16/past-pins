import { SQLiteStorage } from 'expo-sqlite/kv-store';
import { Directory, File, Paths } from 'expo-file-system';

import { assertStartupResetComplete } from '../../modules/past-pins-recovery/src/PastPinsRecoveryModule';
import { diagnostics } from '../recovery/diagnostics-file';
import ownedFiles from './owned-files.json';
import { createDocumentStorage } from './document-storage';

const database = new SQLiteStorage(ownedFiles.databaseName);

export const appStorage = createDocumentStorage({
  getItem: async (key) => { assertStartupResetComplete(); return database.getItem(key); },
  setItem: async (key, value) => { assertStartupResetComplete(); await database.setItem(key, value); },
  async clear() {
    assertStartupResetComplete();
    if (Paths.cache.exists) {
      for (const item of Paths.cache.list()) {
        if (
          (item instanceof File && /^Past-Pins-.*\.json$/.test(item.name)) ||
          (item instanceof Directory && item.name === 'DocumentPicker')
        ) {
          item.delete();
        }
      }
    }
    await diagnostics.clear();
    await database.clear();
  },
});
