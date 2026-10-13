import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync, realpathSync } from 'node:fs';
import { join } from 'node:path';

import document from './demo-document.json';
import ownedFiles from '../../src/storage/owned-files.json';

const container = process.argv[2];
if (!container) throw new Error('Pass the clean iOS simulator app data container.');
const directory = realpathSync(container);
if (!/\/CoreSimulator\/Devices\/[\da-f-]+\/data\/Containers\/Data\/Application\/[\da-f-]+$/iu.test(directory))
  throw new Error('Screenshot data can only be seeded into an iOS simulator app container.');
const databaseDirectory = join(directory, 'Documents', 'SQLite');
const path = join(databaseDirectory, ownedFiles.databaseName);
if ([path, `${path}-wal`, `${path}-shm`].some(existsSync))
  throw new Error('Install the app on a clean simulator before seeding screenshot data.');

mkdirSync(databaseDirectory, { recursive: true });
const database = new Database(path, { create: true });
try {
  database.transaction(() => {
    database.exec('CREATE TABLE storage (key TEXT PRIMARY KEY NOT NULL, value TEXT);');
    database.query('INSERT INTO storage (key, value) VALUES (?, ?);')
      .run('app-data', JSON.stringify(document));
    database.exec('PRAGMA user_version = 1;');
  })();
} finally {
  database.close();
}
console.log('Seeded fictional screenshot data into the clean iOS simulator.');
