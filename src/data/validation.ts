import { countryIds } from '../countries/catalog';
import { t } from '../localization';
import { UserFacingError } from './errors';
import { defaultPreferences, type AppData } from './model';

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
      (status !== 'wishlist' && status !== 'visited' && status !== 'lived')
    ) {
      throw new UserFacingError(t('common.errors.invalidPlaceStatus'));
    }
    places[id] = status;
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
    (prefs.mapView !== 'globe' && prefs.mapView !== 'map') ||
    (prefs.countryGrouping !== 'continent' &&
      prefs.countryGrouping !== 'alphabetical') ||
    typeof prefs.countryLabels !== 'boolean' ||
    typeof prefs.mapSummary !== 'boolean' ||
    typeof prefs.haptics !== 'boolean'
  )
    throw new UserFacingError(t('common.errors.invalidPreferences'));
  return {
    places,
    homeCountryId,
    preferences: {
      mapView: prefs.mapView,
      countryGrouping: prefs.countryGrouping,
      countryLabels: prefs.countryLabels,
      mapSummary: prefs.mapSummary,
      haptics: prefs.haptics,
    },
  };
}
