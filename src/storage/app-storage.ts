import { SQLiteStorage } from 'expo-sqlite/kv-store';

import { createSnapshotStorage } from './snapshot-storage';

export const appStorage = createSnapshotStorage(
  new SQLiteStorage('past-pins-app.db'),
);
