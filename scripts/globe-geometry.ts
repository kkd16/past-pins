import {
  geoArea,
  geoCentroid,
  geoDistance,
  geoGnomonic,
  geoInterpolate,
} from 'd3-geo';
import earcut, { deviation, flatten, refine } from 'earcut';
import { vec3 } from 'gl-matrix';

import { countryFeatures, countryPolygons } from '../src/countries/geography';
import { toCartesian } from '../src/globe/coordinates';
import type { GlobeGeometry } from '../src/globe/geometry';
import { countryAnchor } from './country-anchors';
import { subdivideSphere, type Point } from './subdivide-sphere';

export function generateGlobe(): GlobeGeometry {
  const result: GlobeGeometry = {
    positions: [],
    indices: [],
    borders: [],
    countries: [],
    markers: [],
  };
  for (const shape of countryFeatures) {
    const id = shape.properties.iso_a2.toLowerCase();
    const firstVertex = result.positions.length / 3;
    const firstIndex = result.indices.length;
    if (geoArea(shape) === 0) {
      result.markers.push({ id, position: toCartesian(geoCentroid(shape)) });
    } else {
      for (const polygon of countryPolygons(shape)) {
        const center = geoCentroid({ type: 'Polygon', coordinates: polygon });
        const normal = toCartesian(center);
        // Gnomonic projection keeps great-circle edges straight.
        const project = geoGnomonic()
          .rotate([-center[0], -center[1]])
          .scale(1)
          .translate([0, 0]);
        const points: Point[] = polygon.flatMap((ring) =>
          ring.map(toCartesian),
        );
        if (points.some((point) => vec3.dot(point, normal) <= 0))
          throw new Error(`Polygon exceeds projection hemisphere: ${id}`);
        const flat = flatten(
          polygon.map((ring) =>
            ring.map((point) => project(point as [number, number])!),
          ),
        );
        const triangles = earcut(flat.vertices, flat.holes);
        if (deviation(flat.vertices, flat.holes, 2, triangles) > 1e-8)
          throw new Error(`Triangulation area mismatch: ${id}`);
        refine(triangles, flat.vertices);
        const indices = subdivideSphere(points, triangles, 2);
        const offset = result.positions.length / 3;
        result.positions.push(...points.flat());
        for (let i = 0; i < indices.length; i += 3) {
          const triangle = indices.slice(i, i + 3);
          const [a, b, c] = triangle.map((index) => points[index]);
          const cross = vec3.cross(
            [0, 0, 0],
            vec3.subtract([0, 0, 0], b, a),
            vec3.subtract([0, 0, 0], c, a),
          );
          const winding = vec3.dot(cross, a);
          if (Math.abs(winding) < 1e-15) continue;
          if (winding < 0)
            [triangle[1], triangle[2]] = [triangle[2], triangle[1]];
          result.indices.push(...triangle.map((index) => index + offset));
        }
        for (const ring of polygon) {
          for (let i = 1; i < ring.length; i++) {
            const start = ring[i - 1] as [number, number];
            const end = ring[i] as [number, number];
            const interpolate = geoInterpolate(start, end);
            const steps = Math.max(
              1,
              Math.ceil(geoDistance(start, end) / (Math.PI / 180)),
            );
            for (let step = 0; step < steps; step++) {
              result.borders.push(
                ...toCartesian(interpolate(step / steps)),
                ...toCartesian(interpolate((step + 1) / steps)),
              );
            }
          }
        }
      }
      if (result.indices.length === firstIndex)
        throw new Error(`No globe triangles for ${id}`);
    }
    result.countries.push({
      id,
      ...countryAnchor(shape),
      firstVertex,
      vertexCount: result.positions.length / 3 - firstVertex,
    });
  }
  return result;
}
