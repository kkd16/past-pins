import type { CountryId } from './types';

export const visitsKey = 'past-pins.visits.v1';

export class InvalidVisitsError extends Error {}

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

export function createVisitStorage(
  storage: KeyValueStorage,
  knownIds: ReadonlySet<CountryId>,
) {
  let queue = Promise.resolve();
  return {
    async load() {
      return decodeVisits(await storage.getItem(visitsKey), knownIds);
    },
    save(visitedIds: ReadonlySet<CountryId>) {
      const ids = [...visitedIds].sort();
      if (ids.some((id) => !knownIds.has(id)))
        throw new Error('Cannot save an unknown country ID.');
      const value = JSON.stringify({ version: 1, visitedIds: ids });
      const write = () => storage.setItem(visitsKey, value);
      // Each caller receives its write failure. A failed write doesn't block the next snapshot.
      queue = queue.then(write, write);
      return queue;
    },
  };
}
