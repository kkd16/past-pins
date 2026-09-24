import { describe, expect, test } from 'bun:test';
import { geoArea, geoContains } from 'd3-geo';
import { quat, vec3 } from 'gl-matrix';

import { countryIds } from '../src/countries/catalog';
import { countryFeatures } from '../src/countries/geography';
import { GlobeCamera } from '../src/globe/camera';
import { toCartesian, toGeographic } from '../src/globe/coordinates';
import { pickCountry } from '../src/globe/picking';
import world from '../src/globe/world.json';

const sourceById = new Map(
  countryFeatures.map((shape) => [shape.properties.iso_a2.toLowerCase(), shape]),
);

describe('globe coordinates', () => {
  test.each([
    { geographic: [0, 0], cartesian: [0, 0, 1] },
    { geographic: [90, 0], cartesian: [1, 0, 0] },
    { geographic: [-90, 0], cartesian: [-1, 0, 0] },
    { geographic: [180, 0], cartesian: [0, 0, -1] },
    { geographic: [0, 90], cartesian: [0, 1, 0] },
    { geographic: [0, -90], cartesian: [0, -1, 0] },
    {
      geographic: [45, 30],
      cartesian: [Math.sqrt(6) / 4, 0.5, Math.sqrt(6) / 4],
    },
  ])(
    'converts known coordinates $geographic independently in both directions',
    ({ geographic, cartesian }) => {
      toCartesian(geographic).forEach((value, axis) => {
        expect(value).toBeCloseTo(cartesian[axis], 10);
      });
      for (const scale of [1, 7]) {
        const actual = toGeographic(
          cartesian.map((value) => value * scale) as [number, number, number],
        );
        expect(actual[0]).toBeCloseTo(geographic[0], 10);
        expect(actual[1]).toBeCloseTo(geographic[1], 10);
      }
    },
  );
});

describe('bundled globe geometry', () => {
  test('covers every source feature with finite geometry or a source-derived marker', () => {
    expect(world.countries.map(({ id }) => id).sort()).toEqual(
      [...countryIds].sort(),
    );
    expect(
      [
        ...world.positions,
        ...world.borders,
        ...world.markers.flatMap(({ position }) => position),
      ].every(Number.isFinite),
    ).toBe(true);
    expect(world.positions.length % 3).toBe(0);
    expect(world.indices.length % 3).toBe(0);
    expect(world.borders.length % 6).toBe(0);
    expect(
      world.indices.every(
        (index) =>
          Number.isInteger(index) &&
          index >= 0 &&
          index < world.positions.length / 3,
      ),
    ).toBe(true);
    for (let index = 0; index < world.positions.length; index += 3)
      expect(
        Math.hypot(...world.positions.slice(index, index + 3)),
      ).toBeCloseTo(1, 6);
    let nextVertex = 0;
    for (const country of world.countries) {
      expect(country.firstVertex).toBe(nextVertex);
      nextVertex += country.vertexCount;
      const shape = sourceById.get(country.id)!;
      if (geoArea(shape) > 0) expect(country.vertexCount).toBeGreaterThan(0);
      else expect(world.markers.some(({ id }) => id === country.id)).toBe(true);
    }
    expect(nextVertex).toBe(world.positions.length / 3);
  });

  test('triangles face outward and their centers lie inside their source, including holes and poles', () => {
    const invalid: string[] = [];
    const vertices = world.positions;
    for (let i = 0; i < world.indices.length; i += 3) {
      const ids = world.indices.slice(i, i + 3);
      const country = world.countries.find(
        ({ firstVertex, vertexCount }) =>
          ids[0] >= firstVertex && ids[0] < firstVertex + vertexCount,
      )!;
      const shape = sourceById.get(country.id)!;
      const [a, b, c] = ids.map((id) =>
        vec3.fromValues(
          ...(vertices.slice(id * 3, id * 3 + 3) as [number, number, number]),
        ),
      );
      const normal = vec3.cross(
        vec3.create(),
        vec3.subtract(vec3.create(), b, a),
        vec3.subtract(vec3.create(), c, a),
      );
      const center = vec3.add(vec3.create(), vec3.add(vec3.create(), a, b), c);
      if (
        ids.some(
          (id) =>
            id < country.firstVertex ||
            id >= country.firstVertex + country.vertexCount,
        ) ||
        vec3.dot(normal, center) <= 0 ||
        !geoContains(shape, toGeographic(center))
      )
        invalid.push(`${country.id}:${i}`);
    }
    expect(invalid).toEqual([]);
  });

  test('country surface areas match the source without missing or excess land', () => {
    const areas = new Map<string, number>();
    for (let i = 0; i < world.indices.length; i += 3) {
      const ids = world.indices.slice(i, i + 3);
      const country = world.countries.find(
        ({ firstVertex, vertexCount }) =>
          ids[0] >= firstVertex && ids[0] < firstVertex + vertexCount,
      )!;
      const [a, b, c] = ids.map((id) =>
        vec3.normalize(
          [0, 0, 0],
          world.positions.slice(id * 3, id * 3 + 3) as [number, number, number],
        ),
      );
      const area =
        2 *
        Math.atan2(
          Math.abs(vec3.dot(a, vec3.cross([0, 0, 0], b, c))),
          1 + vec3.dot(a, b) + vec3.dot(b, c) + vec3.dot(c, a),
        );
      areas.set(country.id, (areas.get(country.id) ?? 0) + area);
    }
    for (const shape of countryFeatures) {
      const area = geoArea(shape);
      if (!area) continue;
      const id = shape.properties.iso_a2.toLowerCase();
      expect(Math.abs((areas.get(id) ?? 0) - area) / area).toBeLessThan(
        0.00001,
      );
    }
  });

  test('sampled interiors have triangles, including antimeridian islands and Antarctica', () => {
    const fixtures: [string, number, number][] = [
      ['ca', -106, 56],
      ['au', 134, -25],
      ['aq', 20, -89],
      ['ru', 179, 67],
      ['ru', -179, 67],
      ['fj', 178, -17.8],
      ['za', 24, -29],
      ['ls', 28.5, -29.5],
    ];
    for (const [id, lon, lat] of fixtures) {
      const point = vec3.fromValues(...toCartesian([lon, lat]));
      const country = world.countries.find((entry) => entry.id === id)!;
      let covered = false;
      for (let i = 0; i < world.indices.length; i += 3) {
        const indices = world.indices.slice(i, i + 3);
        if (
          indices[0] < country.firstVertex ||
          indices[0] >= country.firstVertex + country.vertexCount
        )
          continue;
        const vertices = indices.map((index) =>
          vec3.fromValues(
            ...(world.positions.slice(index * 3, index * 3 + 3) as [
              number,
              number,
              number,
            ]),
          ),
        );
        if (
          vertices.every(
            (a, edge) =>
              vec3.dot(
                vec3.cross(vec3.create(), a, vertices[(edge + 1) % 3]),
                point,
              ) >= -1e-9,
          )
        ) {
          covered = true;
          break;
        }
      }
      expect({ id, covered }).toEqual({ id, covered: true });
    }
  });
});

describe('globe camera and country picking', () => {
  test('launch and reset keep north upright with the equator level', () => {
    const camera = new GlobeCamera();
    camera.resize(390, 844);
    for (let attempt = 0; attempt < 2; attempt++) {
      const north = vec3.transformMat3(vec3.create(), [0, 1, 0], camera.matrix());
      expect(Array.from(north)).toEqual([0, 1, 0]);
      for (const longitude of [-40, 0, 40]) {
        expect(camera.project(toCartesian([longitude, 0]))![1]).toBeCloseTo(422);
      }
      camera.drag(250, 300);
      camera.twist(1);
      camera.reset();
    }
  });

  test('twisting turns clockwise on screen and preserves picking after drag and zoom', () => {
    const camera = new GlobeCamera();
    camera.resize(390, 844);
    camera.drag(30, -20);
    camera.setZoom(2);
    const position = toCartesian([0, 30]);
    const before = camera.project(position)!;
    camera.twist(Math.PI / 2);
    const after = camera.project(position)!;
    expect(after[0] - 195).toBeCloseTo(-(before[1] - 422), 3);
    expect(after[1] - 422).toBeCloseTo(before[0] - 195, 3);
    const geographic = camera.geographicPoint(after[0], after[1])!;
    expect(geographic[0]).toBeCloseTo(0, 3);
    expect(geographic[1]).toBeCloseTo(30, 3);
    expect(camera.zoom).toBe(2);
    expect(Math.hypot(...camera.rotation)).toBeCloseTo(1, 5);
  });

  test('launch is immersive; zoom clamps and reset restores the original view', () => {
    const camera = new GlobeCamera();
    camera.resize(390, 844);
    expect(camera.radius).toBe(234);
    const original = Array.from(camera.rotation);
    camera.setZoom(0.01);
    expect(camera.radius).toBe(175.5);
    camera.setZoom(100);
    expect(camera.zoom).toBe(8);
    camera.drag(100, 100);
    camera.reset();
    expect(Array.from(camera.rotation)).toEqual(original);
    camera.resize(1024, 768);
    expect(camera.radius).toBeCloseTo(460.8);
  });

  test('projection and picking agree after rotation; misses and the back hemisphere are excluded', () => {
    const camera = new GlobeCamera();
    expect(camera.geographicPoint(0, 0)).toBeNull();
    camera.resize(390, 844);
    camera.setZoom(0.9);
    expect(camera.geographicPoint(0, 0)).toBeNull();
    for (const [lon, lat] of [
      [-20, 20],
      [179, 65],
      [-179, -65],
      [40, 89],
    ]) {
      quat.identity(camera.rotation);
      quat.rotateX(camera.rotation, camera.rotation, (lat * Math.PI) / 180);
      quat.rotateY(camera.rotation, camera.rotation, (-lon * Math.PI) / 180);
      const screen = camera.project(toCartesian([lon, lat]))!;
      const geographic = camera.geographicPoint(screen[0], screen[1])!;
      expect(geographic[0]).toBeCloseTo(lon, 3);
      expect(geographic[1]).toBeCloseTo(lat, 3);
      expect(camera.project(toCartesian([lon + 180, -lat]))).toBeNull();
    }
  });

  test('selects front-facing source polygons, holes, and zero-area markers', () => {
    const camera = new GlobeCamera();
    camera.resize(390, 844);
    for (const [id, lon, lat] of [
      ['ca', -106, 56],
      ['ls', 28.5, -29.5],
      ['aq', 20, -89],
    ] as const) {
      quat.identity(camera.rotation);
      quat.rotateX(camera.rotation, camera.rotation, (lat * Math.PI) / 180);
      quat.rotateY(camera.rotation, camera.rotation, (-lon * Math.PI) / 180);
      expect(pickCountry(camera, 195, 422)).toBe(id);
    }
    for (const marker of world.markers) {
      const [lon, lat] = toGeographic(
        marker.position as [number, number, number],
      );
      quat.identity(camera.rotation);
      quat.rotateX(camera.rotation, camera.rotation, (lat * Math.PI) / 180);
      quat.rotateY(camera.rotation, camera.rotation, (-lon * Math.PI) / 180);
      expect(pickCountry(camera, 195, 422)).toBe(marker.id);
    }
  });

  test('drag follows the finger and repeated gestures remain normalized', () => {
    const camera = new GlobeCamera();
    camera.resize(390, 844);
    quat.identity(camera.rotation);
    camera.drag(20, 20);
    const screen = camera.project([0, 0, 1])!;
    expect(screen[0]).toBeGreaterThan(195);
    expect(screen[1]).toBeGreaterThan(422);
    for (let i = 0; i < 1000; i++) camera.drag(1, 10);
    expect(Math.hypot(...camera.rotation)).toBeCloseTo(1, 5);
  });

  test('vertical drags cross both poles and continue around the globe', () => {
    const camera = new GlobeCamera();
    camera.resize(390, 844);
    quat.identity(camera.rotation);
    const quarterTurn = (camera.radius * Math.PI) / 2;
    camera.drag(0, quarterTurn);
    expect(camera.geographicPoint(195, 422)![1]).toBeCloseTo(90, 4);
    camera.drag(0, quarterTurn);
    const opposite = camera.geographicPoint(195, 422)!;
    expect(opposite[1]).toBeCloseTo(0, 4);
    expect(Math.abs(opposite[0])).toBeCloseTo(180, 4);
    camera.drag(0, quarterTurn);
    expect(camera.geographicPoint(195, 422)![1]).toBeCloseTo(-90, 4);
    camera.drag(0, quarterTurn);
    const original = camera.geographicPoint(195, 422)!;
    expect(original[0]).toBeCloseTo(0, 4);
    expect(original[1]).toBeCloseTo(0, 4);
  });
});
