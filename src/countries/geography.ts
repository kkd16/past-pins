import topology from '@rembish/iso-topojson/iso-a2.json';
import { geoContains } from 'd3-geo';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

type Properties = { iso_a2: string; name: string };
export type CountryFeature = Feature<Polygon | MultiPolygon, Properties>;

const world = topology as unknown as Topology<{
  merged: GeometryCollection<Properties>;
}>;

export const countryFeatures = feature(
  world,
  world.objects.merged,
).features.map((shape): CountryFeature => {
  if (
    shape.geometry.type !== 'Polygon' &&
    shape.geometry.type !== 'MultiPolygon'
  ) {
    throw new Error(`Unsupported country geometry: ${shape.properties.iso_a2}`);
  }
  return shape as CountryFeature;
});

export function countryPolygons({ geometry }: CountryFeature) {
  return geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.coordinates;
}

export function countryAtPoint(point: [number, number]) {
  return (
    countryFeatures
      .find((shape) => geoContains(shape, point))
      ?.properties.iso_a2.toLowerCase() ?? null
  );
}
