import { countryIds } from '../countries/catalog';
import { subdivisionIds } from '../subdivisions/catalog';
import { t } from '../localization';
import { UserFacingError } from './errors';
import { defaultPreferences, MAX_LIST_NAME_LENGTH, type AppData, type TravelList } from './model';
import { DataError } from './data-error';

export function validateListName(value: string): string {
  const name = value.trim();
  if (!isListName(name))
    throw new UserFacingError(
      t('common.errors.invalidListName', { count: MAX_LIST_NAME_LENGTH }),
    );
  return name;
}

export function validateListPlaces(ids: readonly string[]): string[] {
  if (ids.some((id) => !isPlaceId(id)))
    throw new UserFacingError(t('common.errors.unknownListPlace'));
  return [...new Set(ids)];
}

function isListName(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 &&
    value === value.trim() && value.length <= MAX_LIST_NAME_LENGTH && !/[\r\n]/.test(value);
}

function isPlaceId(value: unknown): value is string {
  return typeof value === 'string' && (countryIds.has(value) || subdivisionIds.has(value));
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
      !isListName(list.name) ||
      !Array.isArray(list.placeIds) ||
      list.placeIds.some((id) => !isPlaceId(id)) ||
      new Set(list.placeIds).size !== list.placeIds.length
    )
      throw new DataError('invalid-document');
    seen.add(list.id);
    return { id: list.id, name: list.name, placeIds: [...list.placeIds] };
  });
}

function validateStatuses(value: unknown, acceptedIds: ReadonlySet<string>): AppData['places'] {
  if (!object(value)) throw new DataError('invalid-document');
  const statuses: AppData['places'] = {};
  for (const [id, status] of Object.entries(value)) {
    if (!acceptedIds.has(id) || (status !== 'wishlist' && status !== 'visited' && status !== 'lived'))
      throw new DataError('invalid-document');
    statuses[id] = status;
  }
  return statuses;
}

export function validateAppData(value: unknown): AppData {
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
    !exactKeys(prefs, Object.keys(defaultPreferences)) ||
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
