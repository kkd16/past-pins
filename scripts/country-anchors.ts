import {
  geoArea,
  geoCentroid,
  geoContains,
  geoDistance,
  geoGnomonic,
} from 'd3-geo';
import earcut, { flatten } from 'earcut';

import {
  countryPolygons,
  type CountryFeature,
} from '../src/countries/geography';

export function countryAnchor(shape: CountryFeature) {
  const polygons = countryPolygons(shape).map((coordinates) => ({
    type: 'Polygon' as const,
    coordinates,
  }));
  const main = polygons.sort((a, b) => geoArea(b) - geoArea(a))[0];
  const area = geoArea(main);
  let anchor = geoCentroid(main);
  if (area && !geoContains(main, anchor)) {
    const project = geoGnomonic()
      .rotate([-anchor[0], -anchor[1]])
      .scale(1)
      .translate([0, 0]);
    const flat = flatten(
      main.coordinates.map((ring) =>
        ring.map((point) => project(point as [number, number])!),
      ),
    );
    const triangles = earcut(flat.vertices, flat.holes);
    let largest = 0;
    for (let i = 0; i < triangles.length; i += 3) {
      const [a, b, c] = triangles
        .slice(i, i + 3)
        .map((index) => flat.vertices.slice(index * 2, index * 2 + 2));
      const size = Math.abs(
        (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
      );
      const candidate = project.invert!([
        (a[0] + b[0] + c[0]) / 3,
        (a[1] + b[1] + c[1]) / 3,
      ])!;
      if (size > largest && geoContains(main, candidate)) {
        largest = size;
        anchor = candidate;
      }
    }
    if (!largest)
      throw new Error(`No interior anchor for ${shape.properties.iso_a2}`);
  }
  return {
    anchor,
    area,
    angularRadius: Math.max(
      0.01,
      ...main.coordinates[0].map((point) =>
        geoDistance(anchor, point as [number, number]),
      ),
    ),
  };
}
