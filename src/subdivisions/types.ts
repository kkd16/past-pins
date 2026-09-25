import type { CountryId } from '../countries/types';

export type SubdivisionId = string;

export type Subdivision = {
  id: SubdivisionId;
  countryId: CountryId;
  name: string;
  nativeName: string;
  code: string;
  kind: string;
  aliases: readonly string[];
};

export type SubdivisionMapRegion = {
  id: SubdivisionId;
  path: string;
  bounds: [[number, number], [number, number]];
  point: [number, number];
};

export type SubdivisionMapData = {
  width: number;
  height: number;
  focusBounds: [[number, number], [number, number]];
  regions: readonly SubdivisionMapRegion[];
};
