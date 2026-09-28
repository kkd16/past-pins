export type CityParents = {
  countryId: string;
  regionId?: string;
};

export type City = CityParents & {
  id: string;
  name: string;
  adminName: string;
  longitude: number;
  latitude: number;
  population: number;
};

export type CitySearchOptions = {
  query: string;
  countryId?: string;
  countryIds?: readonly string[];
  regionId?: string;
  ids?: readonly string[];
  excludedIds?: readonly string[];
  offset?: number;
  limit?: number;
};

export type CityParentIndex = {
  ids: number[];
  parentIndexes: number[];
  parents: [string, string | null][];
};
