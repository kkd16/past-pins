import { countryIds } from '../countries/catalog';
import { t } from '../localization';
import { subdivisionIds } from '../subdivisions/catalog';
import { UserFacingError } from './errors';
import {
  defaultPreferences,
  MAX_LIST_NAME_LENGTH,
  type AppData,
  type TravelList,
} from './model';

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

export function validateListName(value: string): string {
  const name = value.trim();
  if (!name || name.length > MAX_LIST_NAME_LENGTH || /[\r\n]/.test(name))
    throw new UserFacingError(
      t('common.errors.invalidListName', { count: MAX_LIST_NAME_LENGTH }),
    );
  return name;
}

export function validateListPlaces(ids: readonly string[]): string[] {
  if (ids.some((id) => !countryIds.has(id) && !subdivisionIds.has(id)))
    throw new UserFacingError(t('common.errors.unknownListPlace'));
  return [...new Set(ids)];
}

function validateLists(value: unknown): TravelList[] {
  if (!Array.isArray(value))
    throw new UserFacingError(t('common.errors.invalidLists'));
  const seen = new Set<string>();
  return value.map((list) => {
    if (
      !object(list) ||
      !exactKeys(list, ['id', 'name', 'placeIds']) ||
      typeof list.id !== 'string' ||
      !/^[a-zA-Z0-9:_-]{1,128}$/.test(list.id) ||
      seen.has(list.id) ||
      typeof list.name !== 'string' ||
      !Array.isArray(list.placeIds) ||
      list.placeIds.some((id) => typeof id !== 'string') ||
      new Set(list.placeIds).size !== list.placeIds.length
    )
      throw new UserFacingError(t('common.errors.invalidLists'));
    const name = validateListName(list.name);
    if (name !== list.name)
      throw new UserFacingError(t('common.errors.invalidLists'));
    seen.add(list.id);
    return { id: list.id, name, placeIds: validateListPlaces(list.placeIds) };
  });
}

export function validateAppData(value: unknown): AppData {
  if (
    !object(value) ||
    !exactKeys(value, [
      'places',
      'subdivisions',
      'lists',
      'homeCountryId',
      'preferences',
    ])
  ) {
    throw new UserFacingError(t('common.errors.invalidData'));
  }
  if (!object(value.places))
    throw new UserFacingError(t('common.errors.invalidPlaces'));
  const places: AppData['places'] = {};
  for (const [id, status] of Object.entries(value.places)) {
    if (
      !countryIds.has(id) ||
      (status !== 'wishlist' && status !== 'visited' && status !== 'lived')
    ) {
      throw new UserFacingError(t('common.errors.invalidPlaceStatus'));
    }
    places[id] = status;
  }
  if (!object(value.subdivisions))
    throw new UserFacingError(t('common.errors.invalidSubdivisions'));
  const subdivisions: AppData['subdivisions'] = {};
  for (const [id, status] of Object.entries(value.subdivisions)) {
    if (
      !subdivisionIds.has(id) ||
      (status !== 'wishlist' && status !== 'visited' && status !== 'lived')
    ) {
      throw new UserFacingError(t('common.errors.invalidSubdivisionStatus'));
    }
    subdivisions[id] = status;
  }
  const homeCountryId = value.homeCountryId;
  const lists = validateLists(value.lists);
  if (
    homeCountryId !== null &&
    (typeof homeCountryId !== 'string' || places[homeCountryId] !== 'lived')
  ) {
    throw new UserFacingError(t('common.errors.invalidHome'));
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
    throw new UserFacingError(t('common.errors.invalidPreferences'));
  return {
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
