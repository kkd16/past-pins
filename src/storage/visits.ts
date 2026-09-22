import AsyncStorage from '@react-native-async-storage/async-storage';

import { countryIds } from '../countries/catalog';
import type { VisitStorage } from '../countries/visit-storage';
import { createLocalVisitStorage } from './local-visit-storage';

export const visitStorage: VisitStorage = createLocalVisitStorage(
  AsyncStorage,
  countryIds,
);
