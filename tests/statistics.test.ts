import { describe, expect, test } from 'bun:test';

import { countries, countryIds } from '../src/countries/catalog';
import { getTravelStatistics } from '../src/countries/statistics';
import type { AppData } from '../src/data/model';

describe('travel statistics', () => {
  test('an empty world reports zero progress and every place remaining', () => {
    const result = getTravelStatistics({});
    expect(result.total).toBe(countries.length);
    expect(result.visited).toBe(0);
    expect(result.lived).toBe(0);
    expect(result.wishlist).toBe(0);
    expect(result.remaining).toBe(countries.length);
    expect(result.percent).toBe(0);
    expect(result.byContinent.every(({ visited }) => visited === 0)).toBe(true);
  });

  test('a complete world has 100% progress in every continent', () => {
    const result = getTravelStatistics(
      Object.fromEntries([...countryIds].map((id) => [id, 'visited' as const])),
    );
    expect(result.visited).toBe(countries.length);
    expect(result.remaining).toBe(0);
    expect(result.percent).toBe(100);
    expect(
      result.byContinent.every(({ total, visited }) => total === visited),
    ).toBe(true);
  });

  test('lived contributes to visited, while wishlist contributes to remaining', () => {
    const places: AppData['places'] = {
      ca: 'lived',
      us: 'visited',
      fr: 'visited',
      jp: 'wishlist',
    };
    const first = getTravelStatistics(places);
    expect(first.visited).toBe(3);
    expect(first.lived).toBe(1);
    expect(first.wishlist).toBe(1);
    expect(first.remaining).toBe(countries.length - 3);
    expect(
      Object.fromEntries(
        first.byContinent.map(({ id, visited }) => [id, visited]),
      ),
    ).toEqual({ AF: 0, AN: 0, AS: 0, EU: 1, NA: 2, OC: 0, SA: 0 });
    expect(
      first.byContinent.reduce((sum, continent) => sum + continent.total, 0),
    ).toBe(countries.length);
    expect(first.percent).toBeCloseTo((3 / countries.length) * 100);
    delete places.ca;
    const second = getTravelStatistics(places);
    expect(second.visited).toBe(2);
    expect(second.lived).toBe(0);
    expect(second.byContinent.find(({ id }) => id === 'NA')?.visited).toBe(1);
  });

  test('unknown place keys cannot inflate catalog statistics', () => {
    const result = getTravelStatistics({
      ca: 'lived',
      unknown: 'visited',
      invalid: 'wishlist',
      fictitious: 'lived',
    });
    expect(result).toEqual(getTravelStatistics({ ca: 'lived' }));
  });
});
