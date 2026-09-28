import { projection } from '../atlas/projection';
import type { Place } from '../places/catalog';
import { getSubdivisionMap } from '../subdivisions/geography';

export function getListCityMarkers(places: readonly Place[]) {
  return places.flatMap((place) => {
    if (place.kind !== 'city') return [];
    const point = projection(place.coordinates);
    return point ? [{ id: place.id, point }] : [];
  });
}

export function getListRegionPreview(places: readonly Place[]) {
  const firstPlace = places[0];
  if (
    !firstPlace ||
    places.some(
      (place) =>
        place.kind !== 'region' || place.countryId !== firstPlace.countryId,
    )
  )
    return undefined;

  const map = getSubdivisionMap(firstPlace.countryId);
  if (!map) return undefined;
  const ids = new Set(places.map(({ id }) => id));
  const selected = map.regions.filter(({ id }) => ids.has(id));
  if (!selected.length) return undefined;

  const left = Math.min(...selected.map(({ bounds }) => bounds[0][0]));
  const top = Math.min(...selected.map(({ bounds }) => bounds[0][1]));
  const right = Math.max(...selected.map(({ bounds }) => bounds[1][0]));
  const bottom = Math.max(...selected.map(({ bounds }) => bounds[1][1]));
  const countryWidth = map.focusBounds[1][0] - map.focusBounds[0][0];
  const width = Math.max(
    (right - left) * 1.3,
    (bottom - top) * 2.6,
    countryWidth / 4,
  );
  const height = width / 2;
  const viewBox = [
    (left + right - width) / 2,
    (top + bottom - height) / 2,
    width,
    height,
  ];
  return {
    countryName: firstPlace.countryName,
    regions: map.regions,
    ids,
    viewBox,
    markers: selected,
    markerRadius: width / 100,
  };
}
