import { Directory, File, Paths } from 'expo-file-system';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import { clearCityCatalogDatabase, setCityCatalogDatabase, setCityCatalogRetry, useCityCatalogStatus } from './database';
import manifest from './manifest.json';
import { diagnostics } from '../recovery/diagnostics-file';
import ownedFiles from '../storage/owned-files.json';

const directory = new Directory(Paths.cache, ownedFiles.catalogDirectory).uri;
const databaseName = `cities-${manifest.outputs['catalog.db'].slice(0, 16)}.db`;
const options = { useNewConnection: true };

function CatalogConnection() {
  const database = useSQLiteContext();
  useEffect(() => {
    setCityCatalogDatabase(database);
    return () => clearCityCatalogDatabase(database);
  }, [database]);
  return null;
}

export function CityCatalogLoader() {
  const catalog = useCityCatalogStatus();
  const [attempt, setAttempt] = useState(0);
  const lifecycle = useRef({ active: true, generation: 0 });
  useEffect(() => {
    if (catalog.error) diagnostics.record('catalog', undefined);
  }, [catalog]);
  useEffect(() => {
    const state = lifecycle.current;
    state.active = true;
    setCityCatalogRetry(() => {
      const generation = ++state.generation;
      setCityCatalogDatabase(null);
      try {
        const file = new File(directory, databaseName);
        if (file.exists) file.delete();
        setAttempt(generation);
      } catch {
        setCityCatalogDatabase(null, true);
      }
    });
    return () => {
      setCityCatalogRetry(() => {});
      state.active = false;
      setCityCatalogDatabase(null);
    };
  }, []);
  const initialize = useCallback(async (database: SQLiteDatabase) => {
    try {
      await database.execAsync('PRAGMA query_only = ON');
      await database.getFirstAsync('SELECT geonameId FROM cities LIMIT 1');
      if (!lifecycle.current.active || lifecycle.current.generation !== attempt)
        throw new Error('City catalog initialization cancelled.');
    } catch (error) {
      await database.closeAsync();
      throw error;
    }
  }, [attempt]);
  const fail = useCallback(() => {
    queueMicrotask(() => {
      if (lifecycle.current.active && lifecycle.current.generation === attempt)
        setCityCatalogDatabase(null, true);
    });
  }, [attempt]);
  return (
    <SQLiteProvider
      key={attempt}
      databaseName={databaseName}
      directory={directory}
      options={options}
      assetSource={{ assetId: require('./catalog.db') }}
      onInit={initialize}
      onError={fail}
    >
      <CatalogConnection />
    </SQLiteProvider>
  );
}
