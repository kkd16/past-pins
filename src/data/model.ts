import { getParentPlaceIds } from './place-hierarchy';

export const CURRENT_SCHEMA_VERSION = 1;

export type SavedStatus = 'wishlist' | 'visited' | 'lived';
export type PlaceStatus = SavedStatus | 'unvisited';

export const MAX_LIST_NAME_LENGTH = 80;

export type TravelList = {
  id: string;
  name: string;
  placeIds: string[];
};

export type Preferences = {
  mapView: 'globe' | 'map';
  countryLabels: boolean;
  mapSummary: boolean;
  haptics: boolean;
  countryArrivalAlerts: boolean;
  countryGrouping: 'continent' | 'alphabetical';
};

export type AppData = {
  onboardingCompleted: boolean;
  places: Partial<Record<string, SavedStatus>>;
  lists: TravelList[];
  homePlaceId: string | null;
  preferences: Preferences;
};

export const defaultPreferences: Readonly<Preferences> = {
  mapView: 'globe',
  countryLabels: true,
  mapSummary: true,
  haptics: true,
  countryArrivalAlerts: false,
  countryGrouping: 'continent',
};

export function defaultAppData(): AppData {
  return {
    onboardingCompleted: false,
    places: {},
    lists: [],
    homePlaceId: null,
    preferences: { ...defaultPreferences },
  };
}

export function isVisited(status: PlaceStatus | undefined): status is 'visited' | 'lived' {
  return status === 'visited' || status === 'lived';
}

export function getPlaceStatus(data: AppData, id: string): PlaceStatus {
  return data.places[id] ?? 'unvisited';
}

export function changePlaceStatus(
  data: AppData,
  ids: readonly string[],
  status: PlaceStatus,
  preserveLived = true,
): AppData {
  let places = data.places;
  const targets = new Set(ids);
  function set(id: string, next: PlaceStatus) {
    if ((places[id] ?? 'unvisited') === next) return;
    if (places === data.places) places = { ...places };
    if (next === 'unvisited') delete places[id];
    else places[id] = next;
  }
  for (const id of targets) {
    if (status === 'visited' && preserveLived && places[id] === 'lived') continue;
    set(id, status);
  }
  if (places === data.places) return data;
  if (status !== 'lived') {
    for (const [id, current] of Object.entries(places)) {
      if (!isVisited(current)) continue;
      const parents = getParentPlaceIds(id);
      if (!parents.some((parent) =>
        targets.has(parent) && places[parent] !== 'lived',
      )) continue;
      if (status === 'visited') {
        if (current === 'lived') set(id, 'visited');
      } else set(id, 'unvisited');
    }
  }
  for (const id of targets) {
    const current = places[id];
    if (!isVisited(current)) continue;
    for (const parent of getParentPlaceIds(id)) {
      if (current === 'lived' || !isVisited(places[parent])) set(parent, current);
    }
  }
  const homePlaceId =
    data.homePlaceId && places[data.homePlaceId] === 'lived'
      ? data.homePlaceId
      : null;
  return { ...data, places, homePlaceId };
}

export function changeHome(data: AppData, id: string | null): AppData {
  if (data.homePlaceId === id) return data;
  return {
    ...(id ? changePlaceStatus(data, [id], 'lived') : data),
    homePlaceId: id,
  };
}

export function getHomeCountryId(data: AppData): string | null {
  const id = data.homePlaceId;
  return id ? getParentPlaceIds(id).at(-1) ?? id : null;
}
