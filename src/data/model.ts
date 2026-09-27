import { defaultV1Data, v1Preferences, V1_LIST_NAME_LENGTH, type AppDataV1, type PlaceStatus } from './schemas/v1';

export type { SavedStatus, PlaceStatus, TravelList, Preferences } from './schemas/v1';
export type AppData = AppDataV1;
export const defaultPreferences = v1Preferences;
export const MAX_LIST_NAME_LENGTH = V1_LIST_NAME_LENGTH;
export const defaultAppData = defaultV1Data;

export function isVisited(status: PlaceStatus | undefined): boolean {
  return status === 'visited' || status === 'lived';
}

export function getPlaceStatus(data: AppData, id: string): PlaceStatus {
  return data.places[id] ?? 'unvisited';
}

export function getSubdivisionStatus(data: AppData, id: string): PlaceStatus {
  return data.subdivisions[id] ?? 'unvisited';
}

export type TravelData = Pick<
  AppData,
  'places' | 'subdivisions' | 'lists' | 'homeCountryId'
>;

function changeStatuses(
  current: AppData['places'],
  ids: readonly string[],
  status: PlaceStatus,
  preserveLived: boolean,
): AppData['places'] {
  let next = current;
  for (const id of ids) {
    if (status === 'visited' && preserveLived && next[id] === 'lived') continue;
    if ((next[id] ?? 'unvisited') === status) continue;
    if (next === current) next = { ...current };
    if (status === 'unvisited') delete next[id];
    else next[id] = status;
  }
  return next;
}

export function changeSubdivisionStatus(
  data: AppData,
  ids: readonly string[],
  status: PlaceStatus,
  preserveLived = true,
): AppData {
  const subdivisions = changeStatuses(
    data.subdivisions,
    ids,
    status,
    preserveLived,
  );
  return subdivisions === data.subdivisions ? data : { ...data, subdivisions };
}

export function changePlaceStatus(
  data: AppData,
  ids: readonly string[],
  status: PlaceStatus,
  preserveLived = true,
): AppData {
  const places = changeStatuses(data.places, ids, status, preserveLived);
  if (places === data.places) return data;
  const homeCountryId =
    data.homeCountryId && places[data.homeCountryId] === 'lived'
      ? data.homeCountryId
      : null;
  return { ...data, places, homeCountryId };
}

export function changeHome(data: AppData, id: string | null): AppData {
  if (data.homeCountryId === id) return data;
  return {
    ...data,
    places:
      id && data.places[id] !== 'lived'
        ? { ...data.places, [id]: 'lived' }
        : data.places,
    homeCountryId: id,
  };
}
