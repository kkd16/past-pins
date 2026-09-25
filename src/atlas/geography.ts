import { toGeographic } from '../globe/coordinates';
import world from '../globe/world.json';
import { projection } from './projection';
import atlas from './world.json';

export { mapSize, projection } from './projection';
export const oceanPath = atlas.oceanPath;
export const countryAnchors = new Map(
  world.countries.map((country) => [country.id, country]),
);
export const labelCandidates = [...world.countries].sort(
  (a, b) => b.area - a.area,
);
export const flatCountries = atlas.countries;
export const flatCountryById = new Map(
  flatCountries.map((country) => [country.id, country]),
);
export const flatMarkers = world.markers.map(({ id, position }) => ({
  id,
  point: projection(toGeographic(position as [number, number, number]))!,
}));
