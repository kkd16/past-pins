import { geoArea, geoBounds, geoEquirectangular, geoPath } from 'd3-geo';
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from 'geojson';

import type {
  Subdivision,
  SubdivisionMapData,
} from '../src/subdivisions/types';
import {
  countryPolygons,
  type CountryFeature,
} from '../src/countries/geography';

type Properties = {
  ne_id: number;
  adm1_code: string;
  iso_a2: string;
  iso_3166_2: string | null;
  name: string | null;
  name_en: string | null;
  name_local: string | null;
  name_alt: string | null;
  type_en: string | null;
  type: string | null;
  gadm_level: number;
  longitude: number;
  latitude: number;
};
export type SubdivisionFeature = Feature<Polygon | MultiPolygon, Properties>;
export type SubdivisionSourceData = FeatureCollection<
  Polygon | MultiPolygon,
  Properties
>;
type Point = [number, number];

const idFor = ({ properties }: SubdivisionFeature) => `ne:${properties.ne_id}`;
const compareIds = (a: { id: string }, b: { id: string }) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const clean = (text: string | null) => text?.trim() ?? '';

export function selectSubdivisions(
  source: SubdivisionSourceData,
  countryIds: ReadonlySet<string>,
) {
  const countryCounts = new Map<string, number>();
  for (const { properties } of source.features) {
    const countryId = properties.iso_a2.toLowerCase();
    countryCounts.set(countryId, (countryCounts.get(countryId) ?? 0) + 1);
  }

  const excluded = { countryNotInCatalog: 0, synthetic: 0, wholeCountry: 0 };
  const features = source.features.filter((feature) => {
    const p = feature.properties;
    const countryId = p.iso_a2.toLowerCase();
    if (!countryIds.has(countryId)) {
      excluded.countryNotInCatalog++;
      return false;
    }
    // Natural Earth's +00? and +99? records fill undivided territories and
    // unassigned offshore geometry. Do not turn these into invented regions.
    if (!clean(p.name) || p.adm1_code.includes('+')) {
      excluded.synthetic++;
      return false;
    }
    if (
      countryCounts.get(countryId) === 1 &&
      p.gadm_level === 0 &&
      !p.type &&
      !p.type_en
    ) {
      excluded.wholeCountry++;
      return false;
    }
    if (
      !Number.isSafeInteger(p.ne_id) ||
      p.ne_id <= 0 ||
      !['Polygon', 'MultiPolygon'].includes(feature.geometry.type)
    ) {
      throw new Error(`Invalid upstream region: ${p.adm1_code}`);
    }
    return true;
  });

  const regions: Subdivision[] = features
    .map((feature) => {
      const p = feature.properties;
      const name = clean(p.name);
      const nativeName = clean(p.name_local).split('|')[0] || clean(p.name);
      const aliases = [
        ...new Set(
          [
            clean(p.name_en),
            ...clean(p.name_local).split('|'),
            ...clean(p.name_alt).split('|'),
          ]
            .map((name) => name.trim())
            .filter((alias) => alias && alias !== name && alias !== nativeName),
        ),
      ];
      // Keep the source's valid-looking code for search/display, never as the ID.
      // Natural Earth's provisional X…~ codes are not official ISO identifiers.
      const code = /^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(p.iso_3166_2 ?? '')
        ? p.iso_3166_2!
        : '';
      return {
        id: idFor(feature),
        countryId: p.iso_a2.toLowerCase(),
        name,
        nativeName,
        code,
        kind: clean(p.type_en),
        aliases,
      };
    })
    .sort(compareIds);
  const ids = new Set(regions.map(({ id }) => id));
  if (ids.size !== regions.length)
    throw new Error('Duplicate Natural Earth IDs.');
  return { regions, features, excluded };
}

function distanceSquared(point: Point, start: Point, end: Point) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared
    ? Math.max(
        0,
        Math.min(
          1,
          ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) /
            lengthSquared,
        ),
      )
    : 0;
  return (
    (point[0] - start[0] - t * dx) ** 2 + (point[1] - start[1] - t * dy) ** 2
  );
}

// Douglas–Peucker in final map units. Tiny polygons are preserved rather than
// disappearing from the map; the mobile list is also available for every unit.
export function simplifyRing(points: Point[], tolerance = 0.35): Point[] {
  if (points.length < 5) return points;
  const closed = [...points, points[0]];
  const keep = new Set([0, closed.length - 1]);
  const stack: [number, number][] = [[0, closed.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maximum = tolerance * tolerance;
    let furthest = -1;
    for (let index = start + 1; index < end; index++) {
      const distance = distanceSquared(
        closed[index],
        closed[start],
        closed[end],
      );
      if (distance > maximum) {
        maximum = distance;
        furthest = index;
      }
    }
    if (furthest >= 0) {
      keep.add(furthest);
      stack.push([start, furthest], [furthest, end]);
    }
  }
  const simplified = closed.filter((_, index) => keep.has(index)).slice(0, -1);
  return simplified.length >= 3 ? simplified : points;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function containsPoint(rings: Point[][], point: Point) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i];
      const b = ring[j];
      if (
        a[1] > point[1] !== b[1] > point[1] &&
        point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
      )
        inside = !inside;
    }
  }
  return inside;
}

function interiorPoint(rings: Point[][], preferred: Point) {
  if (containsPoint(rings, preferred)) return preferred;
  // Scan inside the largest rings, taking the widest filled interval. The
  // even-odd rule includes holes; unlike a spherical centroid or old label,
  // this anchor belongs to the actual simplified SVG that users can select.
  const largest = [...rings]
    .sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))
    .slice(0, 4);
  let best: Point | undefined;
  let widest = 0;
  for (const ring of largest) {
    const top = Math.min(...ring.map((p) => p[1]));
    const bottom = Math.max(...ring.map((p) => p[1]));
    for (let row = 1; row < 16; row++) {
      const y = top + ((bottom - top) * row) / 16;
      const crossings: number[] = [];
      for (const outline of rings) {
        for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
          const a = outline[i];
          const b = outline[j];
          if (a[1] > y !== b[1] > y)
            crossings.push(a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]));
        }
      }
      crossings.sort((a, b) => a - b);
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        const width = crossings[i + 1] - crossings[i];
        if (width > widest) {
          widest = width;
          best = [(crossings[i + 1] + crossings[i]) / 2, y];
        }
      }
    }
  }
  return best ?? rings[0][0];
}

function area(ring: Point[]) {
  let result = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    result += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return result / 2;
}

export function generateSubdivisionMaps(
  features: readonly SubdivisionFeature[],
  countries: readonly CountryFeature[],
) {
  const countriesById = new Map(
    countries.map((country) => [
      country.properties.iso_a2.toLowerCase(),
      country,
    ]),
  );
  const groups = new Map<string, SubdivisionFeature[]>();
  for (const feature of features) {
    const id = feature.properties.iso_a2.toLowerCase();
    const group = groups.get(id) ?? [];
    group.push(feature);
    groups.set(id, group);
  }
  const maps: Record<string, SubdivisionMapData> = {};
  for (const countryId of [...groups.keys()].sort()) {
    const group = groups.get(countryId)!;
    const country = countriesById.get(countryId);
    if (!country)
      throw new Error(`Missing country geometry: ${countryId}`);
    const main = countryPolygons(country)
      .map((coordinates) => ({ type: 'Polygon' as const, coordinates }))
      .sort((a, b) => geoArea(b) - geoArea(a))[0];
    if (!main)
      throw new Error(`Empty country geometry: ${countryId}`);
    const collection: SubdivisionSourceData = {
      type: 'FeatureCollection',
      features: group,
    };
    const [[west], [east]] = geoBounds(collection);
    // Rotate the cut away from the country, keeping Fiji/Russia/New Zealand
    // continuous across the international date line without mirroring geography.
    const eastward = east < west ? east + 360 : east;
    const center = (west + eastward) / 2;
    const projection = geoEquirectangular()
      .rotate([-center, 0])
      .precision(0.2)
      .fitExtent(
        [
          [20, 20],
          [980, 680],
        ],
        collection,
      );
    const path = geoPath(projection);
    const regions = group
      .map((feature) => {
        const rings: Point[][] = [];
        const context = {
          beginPath() {
            rings.length = 0;
          },
          moveTo(x: number, y: number) {
            rings.push([[x, y]]);
          },
          lineTo(x: number, y: number) {
            rings[rings.length - 1].push([x, y]);
          },
          closePath() {},
          arc() {
            throw new Error('Unexpected point in subdivision geometry.');
          },
        };
        path.context(context)(feature);
        path.context(null);
        const simplified = rings.map((ring) =>
          simplifyRing(ring).map(([x, y]): Point => [round(x), round(y)]),
        );
        const outline = simplified
          .map((ring) => {
            const points = ring.map(([x, y]) => `${x},${y}`);
            return `M${points.join('L')}Z`;
          })
          .join('');
        const bounds = path
          .bounds(feature)
          .map((point) => point.map(round)) as [Point, Point];
        const label: Point = [
          feature.properties.longitude,
          feature.properties.latitude,
        ];
        const preferred = label.every(Number.isFinite)
          ? projection(label)!
          : simplified[0][0];
        const point = interiorPoint(simplified, preferred).map(
          (v) => Math.round(v * 1e6) / 1e6,
        ) as Point;
        if (
          !outline ||
          /NaN|Infinity/.test(outline) ||
          ![...bounds.flat(), ...point].every(Number.isFinite)
        ) {
          throw new Error(`Invalid projected geometry: ${idFor(feature)}`);
        }
        return { id: idFor(feature), path: outline, bounds, point };
      })
      .sort(compareIds);
    const focusBounds = path
      .bounds(main)
      .map((point) => point.map(round)) as [Point, Point];
    if (!focusBounds.flat().every(Number.isFinite))
      throw new Error(`Invalid country bounds: ${countryId}`);
    maps[countryId] = {
      width: 1000,
      height: 700,
      focusBounds,
      regions,
    };
  }
  return maps;
}
