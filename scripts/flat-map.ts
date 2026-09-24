import { geoArea, geoPath } from 'd3-geo';

import { projection } from '../src/atlas/projection';
import { countryFeatures, countryPolygons } from '../src/countries/geography';

export function generateFlatMap() {
  const path = geoPath(projection);
  return {
    oceanPath: path({ type: 'Sphere' })!,
    countries: countryFeatures.map((feature) => {
      const main = countryPolygons(feature)
        .map((coordinates) => ({ type: 'Polygon' as const, coordinates }))
        .sort((a, b) => geoArea(b) - geoArea(a))[0];
      return {
        id: feature.properties.iso_a2.toLowerCase(),
        path: path(feature) ?? '',
        bounds: path.bounds(main),
      };
    }),
  };
}
