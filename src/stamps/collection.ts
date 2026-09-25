import { searchCountries } from '../countries/search';
import { isVisited, type AppData } from '../data/model';

export type StampScope = 'collected' | 'remaining' | 'all';

export function selectStampCountries(
  places: AppData['places'],
  query: string,
  scope: StampScope,
) {
  return searchCountries(query).filter((country) => {
    const collected = isVisited(places[country.id]);
    return scope === 'all' || collected === (scope === 'collected');
  });
}
