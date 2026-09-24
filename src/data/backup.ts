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
    throw new Error('This file does not contain valid Past Pins data.');
  }
  if (!object(value.places)) throw new Error('The saved places are invalid.');
  const places: AppData['places'] = {};
  for (const [id, status] of Object.entries(value.places)) {
    if (
      !countryIds.has(id) ||
      !['wishlist', 'visited', 'lived'].includes(status as string)
    ) {
      throw new Error('The file contains an unknown place or status.');
    }
    places[id] = status as SavedStatus;
  }
  const homeCountryId = value.homeCountryId;
  if (
    homeCountryId !== null &&
    (typeof homeCountryId !== 'string' || places[homeCountryId] !== 'lived')
  ) {
    throw new Error('Current home must be one of your lived places.');
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
    throw new Error('The saved preferences are invalid.');
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
    throw new Error('This file is not a valid JSON backup.');
  }
  if (
    !object(value) ||
    !exactKeys(value, ['app', 'version', 'data']) ||
    value.app !== 'past-pins' ||
    value.version !== 1
  ) {
    throw new Error('Choose a backup exported by this version of Past Pins.');
  }
  return validateAppData(value.data);
}
