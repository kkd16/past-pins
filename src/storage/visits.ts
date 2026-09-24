import { openDatabaseAsync } from 'expo-sqlite';

import { countryIds } from '../countries/catalog';
import { createSQLiteVisitStorage } from './sqlite-visit-storage';

export const visitStorage = createSQLiteVisitStorage(
  () => openDatabaseAsync('past-pins-visits.db'),
  countryIds,
);
