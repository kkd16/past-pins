import type { CountryScope } from '../countries/filters';
import type { PlacesMode } from './PlaceKindControl';

/** Open a fresh Places view without inheriting its previous search or filters. */
export function placesHref(
  mode: PlacesMode,
  scope: CountryScope = 'all',
  continent = 'all',
) {
  return {
    pathname: '/countries' as const,
    params: {
      mode,
      scope,
      continent,
      query: '',
      intent: String(Date.now()),
    },
  };
}
