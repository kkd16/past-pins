import { geoEqualEarth } from 'd3-geo';

export const mapSize = { width: 1000, height: 500 };
export const projection = geoEqualEarth().fitSize(
  [mapSize.width, mapSize.height],
  { type: 'Sphere' },
);
