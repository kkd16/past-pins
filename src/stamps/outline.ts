import { flatCountryById } from '../atlas/geography';

type StampOutline = {
  path: string;
  bounds: [[number, number], [number, number]];
  transform: string;
};

const outlines = new Map<string, StampOutline | undefined>();

export function getStampOutline(countryId: string): StampOutline | undefined {
  if (outlines.has(countryId)) return outlines.get(countryId);
  const country = flatCountryById.get(countryId);
  if (!country) return undefined;

  const outline = outlineFromPath(country.path);
  outlines.set(countryId, outline);
  return outline;
}

function outlineFromPath(path: string): StampOutline | undefined {
  const rings = (path.match(/M[^M]+/g) ?? []).map((path) => {
    const values = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    let area = 0;
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (let index = 0; index < values.length; index += 2) {
      const x = values[index];
      const y = values[index + 1];
      const next = (index + 2) % values.length;
      area += x * values[next + 1] - values[next] * y;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
    return { path, area, left, top, right, bottom };
  });
  const main = rings.reduce<(typeof rings)[number] | undefined>(
    (largest, ring) =>
      !largest || Math.abs(ring.area) > Math.abs(largest.area) ? ring : largest,
    undefined,
  );
  if (!main || main.right <= main.left || main.bottom <= main.top)
    return undefined;

  const nearbyDistance =
    Math.max(main.right - main.left, main.bottom - main.top) / 2;
  const nearby = rings.filter((ring) => {
    const horizontal = Math.max(
      main.left - ring.right,
      ring.left - main.right,
      0,
    );
    const vertical = Math.max(
      main.top - ring.bottom,
      ring.top - main.bottom,
      0,
    );
    return Math.hypot(horizontal, vertical) <= nearbyDistance;
  });
  const bounds: StampOutline['bounds'] = [
    [
      Math.min(...nearby.map((ring) => ring.left)),
      Math.min(...nearby.map((ring) => ring.top)),
    ],
    [
      Math.max(...nearby.map((ring) => ring.right)),
      Math.max(...nearby.map((ring) => ring.bottom)),
    ],
  ];
  const [[left, top], [right, bottom]] = bounds;
  const width = right - left;
  const height = bottom - top;
  const scale = Math.min(82 / width, 58 / height);
  if (Math.min(width, height) * scale < 2) return undefined;
  return {
    path: nearby.map((ring) => ring.path).join(''),
    bounds,
    transform: `translate(${80 - (width * scale) / 2} ${73 - (height * scale) / 2}) scale(${scale}) translate(${-left} ${-top})`,
  };
}
