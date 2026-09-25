import * as Location from 'expo-location';

import { countryById } from '../countries/catalog';
import { countryAtPoint } from '../countries/geography';
import { UserFacingError } from '../data/errors';
import { t } from '../localization';

type Coordinates = [longitude: number, latitude: number];

let pending: Promise<Coordinates> | null = null;

// Share a lookup when launch and the map button request it together.
export function getCurrentLocation(): Promise<Coordinates> {
  pending ??= locate().finally(() => {
    pending = null;
  });
  return pending;
}

export async function getCurrentCountry([longitude, latitude]: Coordinates) {
  try {
    const addresses = await Location.reverseGeocodeAsync({ longitude, latitude });
    const code = addresses[0]?.isoCountryCode?.toLowerCase();
    const country = code ? countryById.get(code) : undefined;
    if (country) return country;
  } catch {
    // Country selection still works offline using the map's own boundaries.
  }
  const code = countryAtPoint([longitude, latitude]);
  return code ? countryById.get(code) : undefined;
}

async function locate(): Promise<Coordinates> {
  if (!(await Location.hasServicesEnabledAsync()))
    throw new UserFacingError(t('location.servicesDisabled'));
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted)
    throw new UserFacingError(t('location.permissionDenied'));

  const { coords } = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return [coords.longitude, coords.latitude];
}
