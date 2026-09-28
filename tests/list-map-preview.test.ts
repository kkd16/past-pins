import { describe, expect, test } from 'bun:test';

import { projection } from '../src/atlas/projection';
import { getListCityMarkers, getListRegionPreview } from '../src/lists/map-preview';
import { getStaticPlace, type Place } from '../src/places/catalog';
import {
  getCountrySubdivisions,
  subdivisionsByCountry,
} from '../src/subdivisions/catalog';
import { getSubdivisionMap } from '../src/subdivisions/geography';

describe('regional list map preview', () => {
  test('city members use their own points without implying country or region membership', () => {
    const city: Place = {
      id: 'city:6167865',
      name: 'Toronto',
      countryId: 'ca',
      countryName: 'Canada',
      kind: 'city',
      coordinates: [-79.3832, 43.6532],
    };
    const country = getStaticPlace('ca')!;
    const region = getStaticPlace(getCountrySubdivisions('ca')[0].id)!;
    expect(getListCityMarkers([country, region, city])).toEqual([
      { id: city.id, point: projection(city.coordinates!)! },
    ]);
    expect(getListCityMarkers([country, region])).toEqual([]);
    expect(getListRegionPreview([city])).toBeUndefined();
    expect(getListRegionPreview([region, city])).toBeUndefined();
  });

  test('highlights the actual members and keeps surrounding regions', () => {
    const regions = getCountrySubdivisions('ca');
    const places = regions
      .filter(({ code }) => code === 'CA-ON' || code === 'CA-QC')
      .map(({ id }) => getStaticPlace(id)!);
    const preview = getListRegionPreview(places)!;
    expect(preview.countryName).toBe('Canada');
    expect(preview.regions).toHaveLength(regions.length);
    expect([...preview.ids]).toEqual(places.map(({ id }) => id));
    const [left, top, width, height] = preview.viewBox;
    expect(width / height).toBe(2);
    for (const region of preview.regions.filter(({ id }) =>
      preview.ids.has(id),
    )) {
      expect(left).toBeLessThan(region.bounds[0][0]);
      expect(top).toBeLessThan(region.bounds[0][1]);
      expect(left + width).toBeGreaterThan(region.bounds[1][0]);
      expect(top + height).toBeGreaterThan(region.bounds[1][1]);
    }
  });

  test('retains the world overview for empty, country, and cross-country lists', () => {
    const canadian = getStaticPlace(getCountrySubdivisions('ca')[0].id)!;
    const japanese = getStaticPlace(getCountrySubdivisions('jp')[0].id)!;
    expect(getListRegionPreview([])).toBeUndefined();
    expect(getListRegionPreview([getStaticPlace('ca')!])).toBeUndefined();
    expect(getListRegionPreview([getStaticPlace('ca')!, canadian])).toBeUndefined();
    expect(getListRegionPreview([canadian, japanese])).toBeUndefined();
  });

  test('keeps city regions and scattered islands visible without country exceptions', () => {
    const paris = getCountrySubdivisions('fr').find(
      ({ code }) => code === 'FR-75',
    )!;
    const city = getListRegionPreview([getStaticPlace(paris.id)!])!;
    expect(city.viewBox[2]).toBeLessThan(getSubdivisionMap('fr')!.width / 10);
    expect(city.markers.map(({ id }) => id)).toContain(paris.id);

    const tokyo = getCountrySubdivisions('jp').find(
      ({ code }) => code === 'JP-13',
    )!;
    const islands = getListRegionPreview([getStaticPlace(tokyo.id)!])!;
    expect(islands.markers.map(({ id }) => id)).toContain(tokyo.id);
  });

  test('frames generated outlines and tiny regions across every supported country', () => {
    let markerCount = 0;
    for (const regions of subdivisionsByCountry.values()) {
      const preview = getListRegionPreview(
        regions.map(({ id }) => getStaticPlace(id)!),
      )!;
      expect(preview.viewBox.every(Number.isFinite)).toBe(true);
      expect(preview.viewBox[2]).toBeGreaterThan(0);
      expect(preview.regions).toHaveLength(regions.length);
      for (const region of preview.markers) {
        markerCount++;
        const [left, top, width, height] = preview.viewBox;
        expect(region.point[0] - preview.markerRadius).toBeGreaterThan(left);
        expect(region.point[1] - preview.markerRadius).toBeGreaterThan(top);
        expect(region.point[0] + preview.markerRadius).toBeLessThan(
          left + width,
        );
        expect(region.point[1] + preview.markerRadius).toBeLessThan(
          top + height,
        );
      }
    }
    expect(markerCount).toBeGreaterThan(0);
  });
});
