export type GlobeGeometry = {
  positions: number[];
  indices: number[];
  borders: number[];
  countries: {
    id: string;
    firstVertex: number;
    vertexCount: number;
  }[];
};
