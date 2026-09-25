import { SQLiteStorage } from 'expo-sqlite/kv-store';
import { Directory, File, Paths } from 'expo-file-system';

import { createSnapshotStorage } from './snapshot-storage';

const database = new SQLiteStorage('past-pins-app.db');

export const appStorage = createSnapshotStorage({
  getItem: (key) => database.getItem(key),
  setItem: (key, value) => database.setItem(key, value),
  async clear() {
    // Remove backup leftovers, including imports interrupted by an app exit.
    // Leave Expo's runtime caches alone (especially when running in Expo Go).
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
    await database.clear();
  },
});
