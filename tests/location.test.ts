import { beforeEach, describe, expect, test } from 'bun:test';

import { FlatCamera } from '../src/atlas/FlatCamera';
import { GlobeCamera } from '../src/globe/camera';
import { t } from '../src/localization';
import { location } from './native-location';

const {
  hasServicesEnabledAsync: services,
  requestForegroundPermissionsAsync: permission,
  getCurrentPositionAsync: position,
  reverseGeocodeAsync: geocode,
} = location;
const { getCurrentCountry, getCurrentLocation } = await import('../src/location/current-location');

beforeEach(() => {
  services.mockReset().mockResolvedValue(true);
  permission.mockReset().mockResolvedValue({ granted: true });
  position.mockReset().mockResolvedValue({ timestamp: Date.now(), coords: { longitude: -75.69, latitude: 45.42 } });
  geocode.mockReset().mockResolvedValue([{ isoCountryCode: 'CA' }]);
});

describe('current location', () => {
  test('shares an in-flight lookup and refreshes on the next request', async () => {
    const points = await Promise.all([getCurrentLocation(), getCurrentLocation()]);
    expect(points).toEqual([[-75.69, 45.42], [-75.69, 45.42]]);
    expect(permission).toHaveBeenCalledTimes(1);
    expect(position).toHaveBeenCalledTimes(1);
    position.mockResolvedValue({ timestamp: Date.now(), coords: { longitude: 2.35, latitude: 48.86 } });
    expect(await getCurrentLocation()).toEqual([2.35, 48.86]);
    expect(position).toHaveBeenCalledTimes(2);
  });

  test('does not request a position when permission is denied, and can retry', async () => {
    permission.mockResolvedValue({ granted: false });
    await expect(getCurrentLocation()).rejects.toThrow(t('location.permissionDenied'));
    expect(position).not.toHaveBeenCalled();
    permission.mockResolvedValue({ granted: true });
    expect(await getCurrentLocation()).toEqual([-75.69, 45.42]);
  });

  test('does not ask for permission when device location services are off', async () => {
    services.mockResolvedValue(false);
    await expect(getCurrentLocation()).rejects.toThrow(t('location.servicesDisabled'));
    expect(permission).not.toHaveBeenCalled();
    expect(position).not.toHaveBeenCalled();
  });

  test('recovers after a native lookup fails', async () => {
    position.mockRejectedValueOnce(new Error('No fix'));
    await expect(getCurrentLocation()).rejects.toThrow('No fix');
    expect(await getCurrentLocation()).toEqual([-75.69, 45.42]);
  });
});

describe('location geography', () => {
  test('matches native ISO country codes to the catalog', async () => {
    expect((await getCurrentCountry([-75.69, 45.42]))?.id).toBe('ca');
    expect(geocode).toHaveBeenCalledWith({ longitude: -75.69, latitude: 45.42 });
    geocode.mockResolvedValue([{ isoCountryCode: 'FJ' }]);
    expect((await getCurrentCountry([178.45, -18.14]))?.id).toBe('fj');
  });

  test('skips missing and unsupported countries', async () => {
    for (const addresses of [[], [{ isoCountryCode: null }], [{ isoCountryCode: 'ZZ' }]]) {
      geocode.mockResolvedValue(addresses);
      expect(await getCurrentCountry([-30, 0])).toBeUndefined();
    }
  });

  test('selects the country from map boundaries when geocoding is offline', async () => {
    geocode.mockRejectedValue(new Error('Offline'));
    expect((await getCurrentCountry([-75.69, 45.42]))?.id).toBe('ca');
    expect((await getCurrentCountry([2.35, 48.86]))?.id).toBe('fr');
    expect(await getCurrentCountry([-30, 0])).toBeUndefined();
    expect(await getCurrentLocation()).toEqual([-75.69, 45.42]);
  });

  test('uses map boundaries when the native country is missing', async () => {
    geocode.mockResolvedValue([]);
    expect((await getCurrentCountry([-75.69, 45.42]))?.id).toBe('ca');
  });

  test('both cameras focus coordinates rather than a country or home anchor', () => {
    const point: [number, number] = [-75.69, 45.42];
    const flat = new FlatCamera();
    flat.resize(390, 844);
    flat.start('fr');
    flat.focusLocation(point);
    const screen = flat.project(point)!;
    expect(screen[0]).toBeCloseTo(195, 4);
    expect(screen[1]).toBeCloseTo(422, 4);

    const globe = new GlobeCamera();
    globe.resize(390, 844);
    globe.focus(point, 0.1);
    const center = globe.geographicPoint(195, 422)!;
    expect(center[0]).toBeCloseTo(point[0], 4);
    expect(center[1]).toBeCloseTo(point[1], 4);
  });
});
