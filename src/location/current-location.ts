import * as Location from 'expo-location';

import { countryById } from '../countries/catalog';
import { UserFacingError } from '../data/errors';
import { t } from '../localization';

export type Coordinates = [longitude: number, latitude: number];

let pending: Promise<Coordinates> | null = null;

// Share a lookup when launch and the map button request it together.
export function getCurrentLocation(): Promise<Coordinates> {
  pending ??= locate().finally(() => {
    pending = null;
  });
  return pending;
}

export async function getCurrentCountry([longitude, latitude]: Coordinates) {
  const addresses = await Location.reverseGeocodeAsync({ longitude, latitude });
  const code = addresses[0]?.isoCountryCode?.toLowerCase();
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
