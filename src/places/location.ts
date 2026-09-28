import { continents, countries, countryById } from '../countries/catalog';
import { t } from '../localization';
import { subdivisionById } from '../subdivisions/catalog';
import type { PlacesMode } from './PlaceKindControl';

export type PlaceLocation =
  | { kind: 'anywhere' }
  | { kind: 'continent' | 'country' | 'region'; id: string };

export const anywhere: PlaceLocation = { kind: 'anywhere' };

export function readPlaceLocation(value: unknown): PlaceLocation {
  if (typeof value !== 'string') return anywhere;
  if (countryById.has(value)) return { kind: 'country', id: value };
  if (subdivisionById.has(value)) return { kind: 'region', id: value };
  const continent = continents.find(({ id }) => `continent:${id}` === value);
  return continent ? { kind: 'continent', id: continent.id } : anywhere;
}

export function locationParam(location: PlaceLocation) {
  return location.kind === 'anywhere' ? 'anywhere'
    : location.kind === 'continent' ? `continent:${location.id}` : location.id;
}

export function locationForMode(location: PlaceLocation, mode: PlacesMode): PlaceLocation {
  if (location.kind === 'region' && mode !== 'cities')
    return locationForMode({ kind: 'country', id: subdivisionById.get(location.id)!.countryId }, mode);
  if (location.kind === 'country' && mode === 'countries')
    return { kind: 'continent', id: countryById.get(location.id)!.continent.id };
  return location;
}

export function getLocationLabel(location: PlaceLocation) {
  switch (location.kind) {
    case 'anywhere': return t('places.anywhere');
    case 'continent': return continents.find(({ id }) => id === location.id)!.name;
    case 'country': return countryById.get(location.id)!.name;
    case 'region': return subdivisionById.get(location.id)!.name;
  }
}

export function getLocationFilters(location: PlaceLocation) {
  switch (location.kind) {
    case 'anywhere': return {};
    case 'continent': return { countryIds: countries.filter((country) => country.continent.id === location.id).map(({ id }) => id) };
    case 'country': return { countryId: location.id };
    case 'region': return { countryId: subdivisionById.get(location.id)!.countryId, regionId: location.id };
  }
}

export function readPlacesMode(value: unknown): PlacesMode {
  return value === 'cities' || value === 'regions' ? value : 'countries';
}
