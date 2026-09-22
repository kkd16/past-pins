import {
  InvalidVisitsError,
  type VisitStorage,
} from '../countries/visit-storage';
import type { CountryId } from '../countries/types';

export const visitsKey = 'past-pins.visits.v1';

type KeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export function decodeVisits(
  raw: string | null,
  knownIds: ReadonlySet<CountryId>,
): Set<CountryId> {
  if (raw === null) return new Set();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new InvalidVisitsError(
      'Saved visits could not be read. Your saved data has not been changed.',
    );
  }
  if (
    !value ||
    typeof value !== 'object' ||
    !('version' in value) ||
    value.version !== 1 ||
    !('visitedIds' in value) ||
    !Array.isArray(value.visitedIds)
  ) {
    throw new InvalidVisitsError(
      'This saved collection has an unsupported format. Your saved data has not been changed.',
    );
  }
  const ids: unknown[] = value.visitedIds;
  if (
    ids.some((id) => typeof id !== 'string' || !knownIds.has(id)) ||
    new Set(ids).size !== ids.length
  ) {
    throw new InvalidVisitsError(
      'Some saved places could not be recognized. Your saved data has not been changed.',
    );
  }
  return new Set(ids as CountryId[]);
}

export function createLocalVisitStorage(
  storage: KeyValueStorage,
  knownIds: ReadonlySet<CountryId>,
): VisitStorage {
  let queue = Promise.resolve();
  return {
    async load() {
      return decodeVisits(await storage.getItem(visitsKey), knownIds);
    },
    async save(visitedIds: ReadonlySet<CountryId>) {
      const ids = [...visitedIds].sort();
      if (ids.some((id) => !knownIds.has(id)))
        throw new Error('Cannot save an unknown country ID.');
      const value = JSON.stringify({ version: 1, visitedIds: ids });
      const write = () => storage.setItem(visitsKey, value);
      queue = queue.then(write, write);
      return queue;
    },
  };
}
