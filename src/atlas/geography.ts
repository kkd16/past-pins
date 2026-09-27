import { toGeographic } from '../globe/coordinates';
import metadata from './metadata.json';
import { projection } from './projection';
import atlas from './world.json';

export { mapSize, projection } from './projection';
export const oceanPath = atlas.oceanPath;
export const countryAnchors = new Map(
  metadata.countries.map((country) => [country.id, country]),
);
export const labelCandidates = [...metadata.countries].sort(
  (a, b) => b.area - a.area,
);
export const flatCountries = atlas.countries;
export const flatCountryById = new Map(
  flatCountries.map((country) => [country.id, country]),
);
export const flatMarkers = metadata.markers.map(({ id, position }) => ({
  id,
  point: projection(toGeographic(position as [number, number, number]))!,
}));
