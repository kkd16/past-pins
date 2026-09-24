import { continents, countries } from './catalog';
import type { CountryId } from './types';

export function getVisitStatistics(visitedIds: ReadonlySet<CountryId>) {
  const byContinent = continents.map((continent) => {
    const places = countries.filter(
      (country) => country.continent.id === continent.id,
    );
    return {
      ...continent,
      total: places.length,
      visited: places.filter((country) => visitedIds.has(country.id)).length,
    };
  });
  const total = countries.length;
  const visited = byContinent.reduce(
    (sum, continent) => sum + continent.visited,
    0,
  );
  return {
    total,
    visited,
    remaining: total - visited,
    percent: total ? (visited / total) * 100 : 0,
    byContinent,
  };
}
