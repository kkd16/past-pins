import topology from '@rembish/iso-topojson/iso-a2.json';
import {
  continents as continentNames,
  countries as metadata,
} from 'countries-list';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

import type { Continent, Country, CountryId } from './types';

type MapProperties = { iso_a2: string; name: string };

// The published shape and metadata packages meet only here. Screens use our types.
const world = topology as unknown as Topology<{
  merged: GeometryCollection<MapProperties>;
}>;
const shapes = feature(world, world.objects.merged);
const width = 1000;
const height = 540;
const projection = geoNaturalEarth1().fitExtent(
  [
    [8, 8],
    [width - 8, height - 8],
  ],
  shapes,
);
const drawPath = geoPath(projection);
const continentById = new Map<string, Continent>();

const locations: Country[] = shapes.features.map((shape) => {
  const { iso_a2: code, name } = shape.properties;
  const details = metadata[code as keyof typeof metadata];
  if (!details || !name) throw new Error(`Missing country metadata: ${code}`);
  const continentId = details.continent;
  const continentName = continentNames[continentId];
  if (!continentName) throw new Error(`Missing continent: ${code}`);
  if (!continentById.has(continentId)) {
    continentById.set(continentId, { id: continentId, name: continentName });
  }
  const path = drawPath(shape);
  if (!path || /NaN|Infinity/.test(path))
    throw new Error(`Invalid map shape: ${code}`);
  return {
    id: code.toLowerCase(),
    name,
    continent: continentById.get(continentId)!,
    path,
  };
});

export const worldMap = {
  viewBox: `0 0 ${width} ${height}`,
  width,
  height,
  locations,
};
export const countries: readonly Country[] = [...locations].sort((a, b) =>
  a.name.localeCompare(b.name, 'en'),
);
export const countryById = new Map(
  countries.map((country) => [country.id, country]),
);
export const countryIds: ReadonlySet<CountryId> = new Set(countryById.keys());
export const continents: readonly Continent[] = [
  ...continentById.values(),
].sort((a, b) => a.name.localeCompare(b.name, 'en'));

if (countryIds.size !== countries.length)
  throw new Error('Duplicate country IDs.');
