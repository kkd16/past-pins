import { t } from '../localization';
import { UserFacingError } from './errors';
import { countryIds } from '../countries/catalog';
import { defaultPreferences, type AppData, type SavedStatus } from './model';

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

export function validateAppData(value: unknown): AppData {
  if (
    !object(value) ||
    !exactKeys(value, ['places', 'homeCountryId', 'preferences'])
  ) {
    throw new UserFacingError(t('common.errors.invalidData'));
  }
  if (!object(value.places))
    throw new UserFacingError(t('common.errors.invalidPlaces'));
  const places: AppData['places'] = {};
  for (const [id, status] of Object.entries(value.places)) {
    if (
      !countryIds.has(id) ||
      !['wishlist', 'visited', 'lived'].includes(status as string)
    ) {
      throw new UserFacingError(t('common.errors.invalidPlaceStatus'));
    }
    places[id] = status as SavedStatus;
  }
  const homeCountryId = value.homeCountryId;
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
    !['globe', 'map'].includes(prefs.mapView as string) ||
    !['continent', 'alphabetical'].includes(prefs.countryGrouping as string) ||
    typeof prefs.countryLabels !== 'boolean' ||
    typeof prefs.mapSummary !== 'boolean' ||
    typeof prefs.haptics !== 'boolean'
  )
    throw new UserFacingError(t('common.errors.invalidPreferences'));
  return {
    places,
    homeCountryId,
    preferences: {
      mapView: prefs.mapView as AppData['preferences']['mapView'],
      countryGrouping:
        prefs.countryGrouping as AppData['preferences']['countryGrouping'],
      countryLabels: prefs.countryLabels,
      mapSummary: prefs.mapSummary,
      haptics: prefs.haptics,
    },
  };
}

export function encodeBackup(data: AppData): string {
  return JSON.stringify(
    { app: 'past-pins', version: 1, data: validateAppData(data) },
    null,
    2,
  );
}

export function decodeBackup(text: string): AppData {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new UserFacingError(t('common.errors.invalidJson'));
  }
  if (
    !object(value) ||
    !exactKeys(value, ['app', 'version', 'data']) ||
    value.app !== 'past-pins' ||
    value.version !== 1
  ) {
    throw new UserFacingError(t('common.errors.invalidBackup'));
  }
  return validateAppData(value.data);
}
