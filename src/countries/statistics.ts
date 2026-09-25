import { isVisited, type AppData } from '../data/model';
import { continents, countries } from './catalog';

export function getTravelStatistics(places: AppData['places']) {
  const byContinent = continents.map((continent) => {
    const members = countries.filter(
      (country) => country.continent.id === continent.id,
    );
    return {
      ...continent,
      total: members.length,
      visited: members.filter((country) => isVisited(places[country.id]))
        .length,
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
    wishlist: countries.filter((country) => places[country.id] === 'wishlist')
      .length,
    lived: countries.filter((country) => places[country.id] === 'lived').length,
    remaining: total - visited,
    visitedRatio: total ? visited / total : 0,
    byContinent,
  };
}
