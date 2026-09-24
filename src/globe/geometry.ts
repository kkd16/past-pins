export type GlobeGeometry = {
  positions: number[];
  indices: number[];
  borders: number[];
  countries: {
    id: string;
    anchor: [number, number];
    area: number;
    angularRadius: number;
    firstVertex: number;
    vertexCount: number;
  }[];
  markers: { id: string; position: number[] }[];
};
