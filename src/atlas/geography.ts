import { geoArea, geoEqualEarth, geoPath } from 'd3-geo';

import { countryFeatures, countryPolygons } from '../countries/geography';
import world from '../globe/world.json';

export const mapSize = { width: 1000, height: 500 };
export const projection = geoEqualEarth().fitSize(
  [mapSize.width, mapSize.height],
  { type: 'Sphere' },
);
const path = geoPath(projection);
export const oceanPath = path({ type: 'Sphere' })!;
export const countryAnchors = new Map(
  world.countries.map((country) => [country.id, country]),
);
export const labelCandidates = [...world.countries].sort(
  (a, b) => b.area - a.area,
);
export const flatCountries = countryFeatures.map((feature) => {
  const id = feature.properties.iso_a2.toLowerCase();
  const main = countryPolygons(feature)
    .map((coordinates) => ({ type: 'Polygon' as const, coordinates }))
    .sort((a, b) => geoArea(b) - geoArea(a))[0];
  return { id, path: path(feature) ?? '', bounds: path.bounds(main) };
});
export const flatCountryById = new Map(
  flatCountries.map((country) => [country.id, country]),
);
