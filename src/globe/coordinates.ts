import type { ReadonlyVec3 } from 'gl-matrix';

const radians = Math.PI / 180;

export function toCartesian([longitude, latitude]: readonly number[]): [
  number,
  number,
  number,
] {
  const lat = latitude * radians;
  const lon = longitude * radians;
  return [
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.cos(lon),
  ];
}

export function toGeographic(point: ReadonlyVec3): [number, number] {
  return [
    Math.atan2(point[0], point[2]) / radians,
    Math.asin(Math.max(-1, Math.min(1, point[1] / Math.hypot(...point)))) /
      radians,
  ];
}
