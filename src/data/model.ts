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

export type TravelData = Pick<AppData, 'places' | 'homeCountryId'>;

export function changePlaceStatus(
  data: AppData,
  ids: readonly string[],
  status: PlaceStatus,
  preserveLived = true,
): AppData {
  const places = { ...data.places };
  let changed = false;
  for (const id of ids) {
    if (status === 'visited' && preserveLived && places[id] === 'lived')
      continue;
    if ((places[id] ?? 'unvisited') === status) continue;
    changed = true;
    if (status === 'unvisited') delete places[id];
    else places[id] = status;
  }
  if (!changed) return data;
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
