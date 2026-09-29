import { describe, expect, test } from 'bun:test';

import { countries } from '../src/countries/catalog';
import { changeHome, defaultAppData } from '../src/data/model';
import { getListRegionPreview } from '../src/lists/map-preview';
import { getStaticPlace, type Place } from '../src/places/catalog';
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
  data.homePlaceId = 'ca';
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
    Object.assign(data.places, {
      [visitedRegion.id]: 'lived',
      [wishlistRegion.id]: 'wishlist',
    });
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
      data.lists[0].placeIds.flatMap((id) => getStaticPlace(id) ?? []),
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
      data.lists[0].placeIds.flatMap((id) => getStaticPlace(id) ?? []),
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
    Object.assign(data.places, { [ontario.id]: 'visited', [quebec.id]: 'wishlist' });
    data.lists = [
      { id: 'regions', name: 'Canada', placeIds: [ontario.id, quebec.id] },
    ];
    const content = getShareContent(
      data,
      { kind: 'list', id: 'regions' },
      defaultShareOptions,
      data.lists[0].placeIds.map((id) => getStaticPlace(id)!),
    )!;
    if (content.kind !== 'list') throw new Error('Expected a list card');
    expect([...getListRegionPreview(content.places)!.ids]).toEqual([
      ontario.id,
    ]);
    expect(content.visited).toBe(1);
  });

  test('loaded cities appear only in member list maps and obey wishlist privacy', () => {
    const data = example();
    const city: Place = {
      id: 'city:6167865',
      name: 'Toronto',
      kind: 'city',
      countryId: 'ca',
      countryName: 'Canada',
      regionName: 'Ontario',
      coordinates: [-79.3832, 43.6532],
    };
    data.places[city.id] = 'lived';
    data.lists = [{ id: 'cities', name: 'Cities', placeIds: [city.id] }];
    const content = getShareContent(
      data,
      { kind: 'list', id: 'cities' },
      defaultShareOptions,
      [getStaticPlace('ca')!, city],
    )!;
    if (content.kind !== 'list') throw new Error('Expected a list card');
    expect(content.places).toEqual([city]);
    expect(content.visited).toBe(1);
    expect(getShareMapLabel(content)).toBe(
      'Places on this map: Toronto, Ontario, Canada.',
    );
    const world = getShareContent(data, { kind: 'world' }, defaultShareOptions)!;
    if (world.kind !== 'world') throw new Error('Expected a world card');
    expect(world.places).not.toHaveProperty(city.id);
    expect(world.stats.visited).toBe(3);
    data.places[city.id] = 'wishlist';
    expect(getShareContent(data, { kind: 'list', id: 'cities' }, defaultShareOptions, [city]))
      .toMatchObject({ places: [], visited: 0 });
    expect(getShareContent(data, { kind: 'list', id: 'cities' }, { ...defaultShareOptions, includeWishlist: true }, [city]))
      .toMatchObject({ places: [city], visited: 0 });
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
      getShareContent(data, { kind: 'list', id: 'empty' }, defaultShareOptions, [getStaticPlace('jp')!]),
    ).toEqual({
      kind: 'list',
      name: 'Empty',
      places: [],
      visited: 0,
    });
    data.places.jp = 'wishlist';
    data.lists[0].placeIds = ['jp'];
    expect(
      getShareContent(data, { kind: 'list', id: 'empty' }, defaultShareOptions, [getStaticPlace('jp')!]),
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
      [undefined, undefined],
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

test('world sharing includes a granular home only when explicitly enabled', () => {
  const home: Place = { id: 'city:6167865', name: 'Toronto', kind: 'city', countryId: 'ca', countryName: 'Canada', regionName: 'Ontario', coordinates: [-79.4163, 43.70011] };
  const data = changeHome(defaultAppData(), home.id);
  const shown = getShareContent(data, { kind: 'world' }, { ...defaultShareOptions, includeHome: true }, [home]);
  expect(shown).toMatchObject({ homeName: 'Toronto, Ontario, Canada' });
  const hidden = getShareContent(data, { kind: 'world' }, defaultShareOptions, [home]);
  expect(hidden).toMatchObject({ homeName: undefined, places: { ca: 'visited' } });
});
