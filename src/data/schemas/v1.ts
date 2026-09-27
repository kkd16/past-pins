import { DataError } from '../data-error';
import ids from './v1-ids.json';

const countryIds = new Set(ids.countries);
const subdivisionIds = new Set(ids.subdivisions);

export type SavedStatus = 'wishlist' | 'visited' | 'lived';
export type PlaceStatus = SavedStatus | 'unvisited';

export const V1_LIST_NAME_LENGTH = 80;

export type TravelList = {
  id: string;
  name: string;
  placeIds: string[];
};

export type Preferences = {
  mapView: 'globe' | 'map';
  countryLabels: boolean;
  mapSummary: boolean;
  haptics: boolean;
  countryArrivalAlerts: boolean;
  countryGrouping: 'continent' | 'alphabetical';
};

export type AppDataV1 = {
  onboardingCompleted: boolean;
  places: Partial<Record<string, SavedStatus>>;
  subdivisions: Partial<Record<string, SavedStatus>>;
  lists: TravelList[];
  homeCountryId: string | null;
  preferences: Preferences;
};

export const v1Preferences: Readonly<Preferences> = {
  mapView: 'globe',
  countryLabels: true,
  mapSummary: true,
  haptics: true,
  countryArrivalAlerts: false,
  countryGrouping: 'continent',
};

export function defaultV1Data(): AppDataV1 {
  return {
    onboardingCompleted: false,
    places: {},
    subdivisions: {},
    lists: [],
    homeCountryId: null,
    preferences: { ...v1Preferences },
  };
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function validateLists(value: unknown): TravelList[] {
  if (!Array.isArray(value))
    throw new DataError('invalid-document');
  const seen = new Set<string>();
  return value.map((list) => {
    if (
      !object(list) ||
      !exactKeys(list, ['id', 'name', 'placeIds']) ||
      typeof list.id !== 'string' ||
      !/^[a-zA-Z0-9:_-]{1,128}$/.test(list.id) ||
      seen.has(list.id) ||
      typeof list.name !== 'string' ||
      !list.name || list.name !== list.name.trim() ||
      list.name.length > V1_LIST_NAME_LENGTH || /[\r\n]/.test(list.name) ||
      !Array.isArray(list.placeIds) ||
      list.placeIds.some((id) => typeof id !== 'string' || (!countryIds.has(id) && !subdivisionIds.has(id))) ||
      new Set(list.placeIds).size !== list.placeIds.length
    )
      throw new DataError('invalid-document');
    seen.add(list.id);
    return { id: list.id, name: list.name, placeIds: [...list.placeIds] };
  });
}

function validateStatuses(value: unknown, acceptedIds: ReadonlySet<string>): AppDataV1['places'] {
  if (!object(value)) throw new DataError('invalid-document');
  const statuses: AppDataV1['places'] = {};
  for (const [id, status] of Object.entries(value)) {
    if (!acceptedIds.has(id) || (status !== 'wishlist' && status !== 'visited' && status !== 'lived'))
      throw new DataError('invalid-document');
    statuses[id] = status;
  }
  return statuses;
}

export function validateV1(value: unknown): AppDataV1 {
  if (
    !object(value) ||
    !exactKeys(value, [
      'onboardingCompleted',
      'places',
      'subdivisions',
      'lists',
      'homeCountryId',
      'preferences',
    ]) ||
    typeof value.onboardingCompleted !== 'boolean'
  ) {
    throw new DataError('invalid-document');
  }
  const places = validateStatuses(value.places, countryIds);
  const subdivisions = validateStatuses(value.subdivisions, subdivisionIds);
  const homeCountryId = value.homeCountryId;
  const lists = validateLists(value.lists);
  if (
    homeCountryId !== null &&
    (typeof homeCountryId !== 'string' || places[homeCountryId] !== 'lived')
  ) {
    throw new DataError('invalid-document');
  }
  const prefs = value.preferences;
  if (
    !object(prefs) ||
    !exactKeys(prefs, Object.keys(v1Preferences)) ||
    (prefs.mapView !== 'globe' && prefs.mapView !== 'map') ||
    (prefs.countryGrouping !== 'continent' &&
      prefs.countryGrouping !== 'alphabetical') ||
    typeof prefs.countryLabels !== 'boolean' ||
    typeof prefs.mapSummary !== 'boolean' ||
    typeof prefs.countryArrivalAlerts !== 'boolean' ||
    typeof prefs.haptics !== 'boolean'
  )
    throw new DataError('invalid-document');
  return {
    onboardingCompleted: value.onboardingCompleted,
    places,
    subdivisions,
    lists,
    homeCountryId,
    preferences: {
      mapView: prefs.mapView,
      countryGrouping: prefs.countryGrouping,
      countryLabels: prefs.countryLabels,
      mapSummary: prefs.mapSummary,
      haptics: prefs.haptics,
      countryArrivalAlerts: prefs.countryArrivalAlerts,
    },
  };
}
