import type { CountryId } from './types';

export interface VisitStorage {
  load(): Promise<ReadonlySet<CountryId>>;
  save(visitedIds: ReadonlySet<CountryId>): Promise<void>;
}
