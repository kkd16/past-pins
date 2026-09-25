import type { CountryScope } from '../countries/filters';
import type { Place } from './catalog';
import type { PlacesMode } from './PlaceKindControl';

let intent = 0;

export function countryHref(id: string) {
  return { pathname: '/country/[id]' as const, params: { id } };
}

export function regionsHref(
  id: string,
  focus?: string,
  scope: CountryScope = 'all',
) {
  return { pathname: '/regions/[id]' as const, params: { id, focus, scope } };
}

/** Country details and region maps share the same destinations everywhere. */
export function placeHref(place: Place, scope: CountryScope = 'all') {
  return place.kind === 'country'
    ? countryHref(place.id)
    : regionsHref(place.countryId, place.id, scope);
}

/** A new intent lets repeated visits to the same country focus the map again. */
export function worldMapHref(focus: string) {
  return {
    pathname: '/' as const,
    params: { focus, focusRequest: String(++intent) },
  };
}

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
      intent: String(++intent),
    },
  };
}
