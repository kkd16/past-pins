export type SavedStatus = 'wishlist' | 'visited' | 'lived';
export type PlaceStatus = SavedStatus | 'unvisited';

export type Preferences = {
  mapView: 'globe' | 'map';
  countryLabels: boolean;
  mapSummary: boolean;
  haptics: boolean;
  countryGrouping: 'continent' | 'alphabetical';
};

export type AppData = {
  places: Partial<Record<string, SavedStatus>>;
  subdivisions: Partial<Record<string, SavedStatus>>;
  homeCountryId: string | null;
  preferences: Preferences;
};

export const defaultPreferences: Readonly<Preferences> = {
  mapView: 'globe',
  countryLabels: true,
  mapSummary: true,
  haptics: true,
  countryGrouping: 'continent',
};

export function defaultAppData(): AppData {
  return {
    places: {},
    subdivisions: {},
    homeCountryId: null,
    preferences: { ...defaultPreferences },
  };
}

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
  'places' | 'subdivisions' | 'homeCountryId'
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
