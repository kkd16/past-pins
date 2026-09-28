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

export function placeHref(place: Place, scope: CountryScope = 'all') {
  return place.kind === 'country'
    ? countryHref(place.id)
    : place.kind === 'city'
      ? worldMapHref(place.id)
      : regionsHref(place.countryId, place.id, scope);
}

export function worldMapHref(focus: string) {
  return {
    pathname: '/' as const,
    params: { focus, focusRequest: String(++intent) },
  };
}

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

export function citiesHref(countryId: string, regionId?: string) {
  const href = placesHref('cities');
  return { ...href, params: { ...href.params, countryId, regionId } };
}
