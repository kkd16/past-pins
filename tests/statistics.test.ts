import { describe, expect, test } from 'bun:test';

import { countries, countryIds } from '../src/countries/catalog';
import { getVisitStatistics } from '../src/countries/statistics';

describe('visit statistics', () => {
  test('an empty world reports zero progress and every place remaining', () => {
    const result = getVisitStatistics(new Set());
    expect(result.visited).toBe(0);
    expect(result.remaining).toBe(countries.length);
    expect(result.percent).toBe(0);
    expect(result.byContinent.every(({ visited }) => visited === 0)).toBe(true);
  });

  test('a complete world has 100% progress in every continent', () => {
    const result = getVisitStatistics(countryIds);
    expect(result.visited).toBe(countries.length);
    expect(result.remaining).toBe(0);
    expect(result.percent).toBe(100);
    expect(
      result.byContinent.every(({ total, visited }) => total === visited),
    ).toBe(true);
  });

  test('continent and global totals agree after adding and removing visits', () => {
    const visitedIds = new Set(['ca', 'us', 'fr', 'jp']);
    const first = getVisitStatistics(visitedIds);
    expect(first.visited).toBe(4);
    expect(first.byContinent.find(({ id }) => id === 'NA')?.visited).toBe(2);
    expect(
      first.byContinent.reduce((sum, continent) => sum + continent.total, 0),
    ).toBe(countries.length);
    expect(
      first.byContinent.reduce((sum, continent) => sum + continent.visited, 0),
    ).toBe(first.visited);
    expect(first.percent).toBe((4 / countries.length) * 100);
    visitedIds.delete('ca');
    const second = getVisitStatistics(visitedIds);
    expect(second.visited).toBe(3);
    expect(second.remaining).toBe(countries.length - 3);
    expect(second.byContinent.find(({ id }) => id === 'NA')?.visited).toBe(1);
  });
});
