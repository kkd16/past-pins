import { describe, expect, test } from 'bun:test';

import { countryIds } from '../src/countries/catalog';
import {
  getCountrySubdivisions,
  subdivisionById,
  subdivisionCountriesCount,
  subdivisionIds,
  subdivisions,
  subdivisionsByCountry,
  subdivisionSource,
} from '../src/subdivisions/catalog';
import { getSubdivisionMap } from '../src/subdivisions/geography';
import manifest from '../src/subdivisions/manifest.json';
import source from '../scripts/data/subdivisions-source.json';
import {
  generateSubdivisionMaps,
  selectSubdivisions,
  simplifyRing,
  type SubdivisionFeature,
} from '../scripts/subdivision-data';

function fixture(
  overrides: Partial<SubdivisionFeature['properties']> = {},
): SubdivisionFeature {
  return {
    type: 'Feature',
    properties: {
      ne_id: 1,
      adm1_code: 'AAA-1',
      iso_a2: 'AA',
      iso_3166_2: 'AA-ONE',
      name: 'Source name',
      name_en: 'English alias',
      name_local: 'Local name',
      name_alt: 'Alternative',
      type_en: 'Province',
      type: 'Province',
      gadm_level: 1,
      longitude: 1,
      latitude: 1,
      ...overrides,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0, 2],
          [2, 2],
          [2, 0],
          [0, 0],
        ],
      ],
    },
  };
}

describe('source-derived offline subdivisions', () => {
  test('coverage includes thousands of regions and joins every ID to the country catalog', () => {
    expect(subdivisions.length).toBeGreaterThan(4000);
    expect(subdivisionCountriesCount).toBeGreaterThan(200);
    expect(subdivisions.length).toBe(manifest.regions);
    expect(subdivisionCountriesCount).toBe(manifest.countries);
    expect(subdivisionIds.size).toBe(subdivisions.length);
    for (const region of subdivisions) {
      expect(region.id).toMatch(/^ne:\d+$/);
      expect(region.name.trim().length).toBeGreaterThan(0);
      expect(countryIds.has(region.countryId)).toBe(true);
      expect(subdivisionById.get(region.id)).toBe(region);
      expect(getCountrySubdivisions(region.countryId)).toContain(region);
    }
    expect(subdivisionSource).toEqual(source);
    expect(manifest.sourceFeatures).toBe(
      manifest.regions +
        Object.values(manifest.excluded).reduce((sum, count) => sum + count, 0),
    );
  });

  test('familiar full-coverage countries and countries without source subdivisions stay honest', () => {
    expect(getCountrySubdivisions('ca')).toHaveLength(13);
    expect(getCountrySubdivisions('us')).toHaveLength(51);
    expect(getCountrySubdivisions('jp')).toHaveLength(47);
    expect(getCountrySubdivisions('br')).toHaveLength(27);
    expect(getCountrySubdivisions('de')).toHaveLength(16);
    expect(getCountrySubdivisions('aq')).toEqual([]);
    expect(getCountrySubdivisions('va')).toEqual([]);
    expect(getCountrySubdivisions('unknown')).toEqual([]);
    expect(getSubdivisionMap('unknown')).toBeUndefined();
    expect(getSubdivisionMap('__proto__')).toBeUndefined();
  });

  test('every catalog region has exactly one finite, bounded offline map path', () => {
    const mapped = new Set<string>();
    for (const [countryId, regions] of subdivisionsByCountry) {
      const map = getSubdivisionMap(countryId)!;
      expect(map.width).toBe(1000);
      expect(map.height).toBe(700);
      expect(map.focusBounds?.flat().every(Number.isFinite)).toBe(true);
      expect(map.regions.length).toBe(regions.length);
      for (const region of map.regions) {
        expect(mapped.has(region.id)).toBe(false);
        mapped.add(region.id);
        expect(subdivisionById.get(region.id)!.countryId).toBe(countryId);
        expect(region.path).toMatch(/^M/);
        expect(region.path).toEndWith('Z');
        expect(region.path).not.toMatch(/NaN|Infinity/);
        const [[left, top], [right, bottom]] = region.bounds;
        expect(
          [left, top, right, bottom, ...region.point].every(Number.isFinite),
        ).toBe(true);
        expect(left).toBeGreaterThanOrEqual(0);
        expect(top).toBeGreaterThanOrEqual(0);
        expect(right).toBeLessThanOrEqual(map.width);
        expect(bottom).toBeLessThanOrEqual(map.height);
        expect(region.point[0]).toBeGreaterThanOrEqual(left - 0.1);
        expect(region.point[0]).toBeLessThanOrEqual(right + 0.1);
        expect(region.point[1]).toBeGreaterThanOrEqual(top - 0.1);
        expect(region.point[1]).toBeLessThanOrEqual(bottom + 0.1);
      }
    }
    expect([...mapped].sort()).toEqual([...subdivisionIds].sort());
  });

  test('default framing reaches the main landmass without removing overseas regions', () => {
    for (const countryId of ['us', 'fr']) {
      const map = getSubdivisionMap(countryId)!;
      const [[left, top], [right, bottom]] = map.focusBounds!;
      expect(right - left).toBeLessThan(map.width * 0.75);
      expect(bottom - top).toBeLessThan(map.height * 0.75);
      expect(
        map.regions.some(
          (region) => region.point[0] < left || region.point[0] > right,
        ),
      ).toBe(true);
    }
  });

  test('generated assets stay compact enough to bundle for offline mobile use', async () => {
    expect(
      Bun.file(new URL('../src/subdivisions/maps.json', import.meta.url)).size,
    ).toBeLessThan(5.5 * 1024 * 1024);
    expect(
      Bun.file(new URL('../src/subdivisions/catalog.json', import.meta.url))
        .size,
    ).toBeLessThan(800 * 1024);
  });
});

describe('subdivision importer', () => {
  test('derives identities and names, permits duplicate ISO labels, excludes source placeholders', () => {
    const features = [
      fixture(),
      fixture({ ne_id: 2, name: 'Second region' }),
      fixture({ ne_id: 3, adm1_code: 'AAA+99?', name: null }),
      fixture({ ne_id: 4, iso_a2: '-1' }),
      fixture({
        ne_id: 5,
        iso_a2: 'BB',
        type: null,
        type_en: null,
        gadm_level: 0,
      }),
      fixture({ ne_id: 6, iso_a2: 'CC', iso_3166_2: 'CC-X01~' }),
      fixture({ ne_id: 7, name: '  ' }),
    ];
    const selected = selectSubdivisions(
      { type: 'FeatureCollection', features },
      new Set(['aa', 'bb', 'cc']),
    );
    expect(selected.regions.map(({ id }) => id)).toEqual([
      'ne:1',
      'ne:2',
      'ne:6',
    ]);
    expect(selected.regions[0]).toMatchObject({
      name: 'Source name',
      nativeName: 'Local name',
      code: 'AA-ONE',
      aliases: ['English alias', 'Alternative'],
    });
    expect(selected.regions[1].code).toBe('AA-ONE');
    expect(selected.regions[2].code).toBe('');
    expect(selected.excluded).toEqual({
      countryNotInCatalog: 1,
      synthetic: 2,
      wholeCountry: 1,
    });
    const renamed = selectSubdivisions(
      { type: 'FeatureCollection', features: [fixture({ name: 'Renamed' })] },
      new Set(['aa']),
    );
    expect(renamed.regions[0].id).toBe('ne:1');
  });

  test('rejects duplicate persistent IDs instead of silently overwriting visits', () => {
    expect(() =>
      selectSubdivisions(
        { type: 'FeatureCollection', features: [fixture(), fixture()] },
        new Set(['aa']),
      ),
    ).toThrow('Duplicate Natural Earth IDs');
  });

  test('country-local projection handles the date line and preserves tiny islands', () => {
    const crossing = fixture({ longitude: 179.5, latitude: 0 });
    crossing.geometry = {
      type: 'Polygon',
      coordinates: [
        [
          [179, -1],
          [179, 1],
          [-179, 1],
          [-179, -1],
          [179, -1],
        ],
      ],
    };
    const map = generateSubdivisionMaps([crossing]).aa;
    const [[left, top], [right, bottom]] = map.regions[0].bounds;
    expect(right - left).toBeGreaterThan(600);
    expect(bottom - top).toBeGreaterThan(600);
    const tiny: [number, number][] = [
      [0, 0],
      [0, 0.001],
      [0.001, 0.001],
      [0.001, 0],
      [0, 0],
    ];
    expect(simplifyRing(tiny)).toEqual(tiny);
    const points: [number, number][] = [
      [0, 0],
      [0, 1],
      [0, 2],
      [2, 2],
      [2, 0],
    ];
    expect(simplifyRing(points)).not.toContainEqual([0, 1]);
  });
});
