import { describe, expect, test } from 'bun:test';

import { countries } from '../src/countries/catalog';
import { defaultAppData } from '../src/data/model';
import { getListRegionPreview } from '../src/lists/map-preview';
import {
  defaultShareOptions,
  getShareContent,
  getShareMapLabel,
  parseShareTarget,
} from '../src/sharing/content';
import { getCountrySubdivisions } from '../src/subdivisions/catalog';

function example() {
  const data = defaultAppData();
  data.places = { ca: 'lived', de: 'lived', fr: 'visited', jp: 'wishlist' };
  data.homeCountryId = 'ca';
  return data;
}

describe('shared card content', () => {
  test('defaults conceal home/lived distinctions and exclude wishlist from map and counts', () => {
    const data = example();
    const original = structuredClone(data);
    const content = getShareContent(
      data,
      { kind: 'world' },
      defaultShareOptions,
    )!;
    expect(content.kind).toBe('world');
    if (content.kind !== 'world') throw new Error('Expected a world card');
    expect(content.places).toEqual({
      ca: 'visited',
      de: 'visited',
      fr: 'visited',
    });
    expect(content.homeName).toBeUndefined();
    expect(getShareMapLabel(content)).toBe(
      'Visited: Canada, France, and Germany.',
    );
    expect(content.stats).toMatchObject({ visited: 3, lived: 0, wishlist: 0 });
    expect(data).toEqual(original);
  });

  test('privacy switches are independent and do not expose unknown IDs', () => {
    const data = example();
    data.places.unknown = 'visited';
    for (const includeHome of [false, true]) {
      for (const includeWishlist of [false, true]) {
        const content = getShareContent(
          data,
          { kind: 'world' },
          { includeHome, includeWishlist },
        )!;
        if (content.kind !== 'world') throw new Error('Expected a world card');
        expect(content.homeName).toBe(includeHome ? 'Canada' : undefined);
        expect(content.places.ca).toBe(includeHome ? 'lived' : 'visited');
        expect(content.places.de).toBe(includeHome ? 'lived' : 'visited');
        expect(content.places.jp).toBe(
          includeWishlist ? 'wishlist' : undefined,
        );
        expect(content.places.unknown).toBeUndefined();
        expect(content.stats).toMatchObject({
          visited: 3,
          lived: includeHome ? 2 : 0,
          wishlist: includeWishlist ? 1 : 0,
        });
        expect(content.stats.total).toBe(countries.length);
      }
    }
  });

  test('mixed list exports filter wishlisted countries and regions before counting or mapping', () => {
    const data = example();
    const [visitedRegion, wishlistRegion, unmarkedRegion] =
      getCountrySubdivisions('ca');
    data.subdivisions = {
      [visitedRegion.id]: 'lived',
      [wishlistRegion.id]: 'wishlist',
    };
    data.lists = [
      {
        id: 'trip',
        name: 'Next adventure',
        placeIds: [
          'ca',
          'jp',
          visitedRegion.id,
          wishlistRegion.id,
          unmarkedRegion.id,
          'unknown',
        ],
      },
    ];
    const content = getShareContent(
      data,
      { kind: 'list', id: 'trip' },
      defaultShareOptions,
    )!;
    if (content.kind !== 'list') throw new Error('Expected a list card');
    expect(content.name).toBe('Next adventure');
    expect(content.places.map(({ id }) => id)).toEqual([
      'ca',
      visitedRegion.id,
      unmarkedRegion.id,
    ]);
    expect(content.visited).toBe(2);
    expect(content).not.toHaveProperty('homeName');
    expect(content).not.toHaveProperty('subdivisions');
    const included = getShareContent(
      data,
      { kind: 'list', id: 'trip' },
      {
        ...defaultShareOptions,
        includeWishlist: true,
      },
    )!;
    if (included.kind !== 'list') throw new Error('Expected a list card');
    expect(included.places).toHaveLength(5);
    expect(included.visited).toBe(2);
    expect(data.lists[0].placeIds).toHaveLength(6);
  });

  test('regional lists keep the actual included boundaries; hidden members cannot affect framing', () => {
    const data = example();
    const regions = getCountrySubdivisions('ca');
    const ontario = regions.find(({ code }) => code === 'CA-ON')!;
    const quebec = regions.find(({ code }) => code === 'CA-QC')!;
    data.subdivisions = { [ontario.id]: 'visited', [quebec.id]: 'wishlist' };
    data.lists = [
      { id: 'regions', name: 'Canada', placeIds: [ontario.id, quebec.id] },
    ];
    const content = getShareContent(
      data,
      { kind: 'list', id: 'regions' },
      defaultShareOptions,
    )!;
    if (content.kind !== 'list') throw new Error('Expected a list card');
    expect([...getListRegionPreview(content.places)!.ids]).toEqual([
      ontario.id,
    ]);
    expect(content.visited).toBe(1);
  });

  test('stamp exports include only their country and collection state', () => {
    const data = example();
    for (const [id, collected] of [
      ['ca', true],
      ['fr', true],
      ['jp', false],
      ['us', false],
    ] as const) {
      const content = getShareContent(
        data,
        { kind: 'stamp', id },
        defaultShareOptions,
      )!;
      if (content.kind !== 'stamp') throw new Error('Expected a stamp card');
      expect(content.country.id).toBe(id);
      expect(content.collected).toBe(collected);
      expect(Object.keys(content).sort()).toEqual([
        'collected',
        'country',
        'kind',
      ]);
    }
  });

  test('handles empty and removed data without falling back to a different share target', () => {
    const data = defaultAppData();
    data.lists = [{ id: 'empty', name: 'Empty', placeIds: [] }];
    expect(
      getShareContent(data, { kind: 'list', id: 'empty' }, defaultShareOptions),
    ).toEqual({
      kind: 'list',
      name: 'Empty',
      places: [],
      visited: 0,
    });
    data.places.jp = 'wishlist';
    data.lists[0].placeIds = ['jp'];
    expect(
      getShareContent(data, { kind: 'list', id: 'empty' }, defaultShareOptions),
    ).toMatchObject({ places: [] });
    data.lists = [];
    expect(
      getShareContent(data, { kind: 'list', id: 'empty' }, defaultShareOptions),
    ).toBeNull();
    expect(
      getShareContent(
        data,
        { kind: 'stamp', id: 'missing' },
        defaultShareOptions,
      ),
    ).toBeNull();
    expect(getShareContent(data, null, defaultShareOptions)).toBeNull();
  });

  test('validates share routes, including repeated or missing parameters', () => {
    expect(parseShareTarget(undefined, undefined)).toEqual({ kind: 'world' });
    expect(parseShareTarget('world', undefined)).toEqual({ kind: 'world' });
    expect(parseShareTarget('stamp', 'ca')).toEqual({
      kind: 'stamp',
      id: 'ca',
    });
    expect(parseShareTarget('list', 'trip')).toEqual({
      kind: 'list',
      id: 'trip',
    });
    for (const [kind, id] of [
      ['list', undefined],
      ['stamp', ''],
      ['unknown', 'ca'],
      [['world'], 'ca'],
      ['list', ['trip']],
      [undefined, 'trip'],
    ])
      expect(parseShareTarget(kind, id)).toBeNull();
  });
});
