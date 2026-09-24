import { vec3 } from 'gl-matrix';

export type Point = [number, number, number];

// Share edge midpoints to prevent cracks.
export function subdivideSphere(
  points: Point[],
  triangles: number[],
  degrees: number,
) {
  const threshold = Math.cos((degrees * Math.PI) / 180);
  const midpoints = new Map<string, number>();
  function midpoint(a: number, b: number) {
    if (vec3.dot(points[a], points[b]) >= threshold) return null;
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    let index = midpoints.get(key);
    if (index === undefined) {
      index = points.length;
      points.push(
        vec3.normalize(
          [0, 0, 0],
          vec3.add([0, 0, 0], points[a], points[b]),
        ) as Point,
      );
      midpoints.set(key, index);
    }
    return index;
  }

  let pending = triangles;
  const result: number[] = [];
  while (pending.length) {
    const next: number[] = [];
    for (let i = 0; i < pending.length; i += 3) {
      const vertices = pending.slice(i, i + 3);
      const mids = vertices.map((a, edge) =>
        midpoint(a, vertices[(edge + 1) % 3]),
      );
      const count = mids.filter((index) => index !== null).length;
      if (count === 0) {
        result.push(...vertices);
        continue;
      }
      if (count === 3) {
        const [a, b, c] = vertices;
        const [ab, bc, ca] = mids as number[];
        next.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
      } else {
        // Rotate so the first edge splits and the preceding edge does not.
        const start = mids.findIndex(
          (mid, edge) => mid !== null && mids[(edge + 2) % 3] === null,
        );
        const [a, b, c] = [0, 1, 2].map((j) => vertices[(start + j) % 3]);
        const ab = mids[start]!;
        const bc = mids[(start + 1) % 3];
        next.push(a, ab, c);
        if (bc === null) next.push(ab, b, c);
        else next.push(ab, b, bc, ab, bc, c);
      }
    }
    pending = next;
  }
  return result;
}
