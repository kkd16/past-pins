import { describe, expect, test } from 'bun:test';
import { geoArea, geoContains } from 'd3-geo';

import {
  annotationTranslation,
  calloutRect,
  placeLabels,
  projectLabels,
  type Rect,
} from '../src/atlas/annotations';
import { FlatCamera } from '../src/atlas/FlatCamera';
import {
  countryAnchors,
  flatCountryById,
  flatCountries,
  projection,
} from '../src/atlas/geography';
import { pickFlatCountry } from '../src/atlas/picking';
import { countryFeatures, countryPolygons } from '../src/countries/geography';
import { GlobeCamera } from '../src/globe/camera';
import { toCartesian } from '../src/globe/coordinates';
import world from '../src/globe/world.json';

describe('source-derived atlas', () => {
  test('every anchor is inside its largest source polygon, except source-degenerate markers', () => {
    expect(countryAnchors.size).toBe(countryFeatures.length);
    expect(flatCountryById.size).toBe(countryFeatures.length);
    for (const shape of countryFeatures) {
      const id = shape.properties.iso_a2.toLowerCase();
      const anchor = countryAnchors.get(id)!;
      const main = countryPolygons(shape)
        .map((coordinates) => ({ type: 'Polygon' as const, coordinates }))
        .sort((a, b) => geoArea(b) - geoArea(a))[0];
      expect(anchor.anchor.every(Number.isFinite)).toBe(true);
      expect(anchor.angularRadius).toBeGreaterThan(0);
      if (geoArea(main))
        expect(geoContains(main, anchor.anchor as [number, number])).toBe(true);
      const [[left, top], [right, bottom]] = flatCountryById.get(id)!.bounds;
      const [x, y] = projection(anchor.anchor as [number, number])!;
      expect([left, top, right, bottom].every(Number.isFinite)).toBe(true);
      // Focus bounds must contain the anchor, allowing asset rounding.
      expect(x).toBeGreaterThanOrEqual(left - 0.001);
      expect(x).toBeLessThanOrEqual(right + 0.001);
      expect(y).toBeGreaterThanOrEqual(top - 0.001);
      expect(y).toBeLessThanOrEqual(bottom + 0.001);
    }
    expect(flatCountries.every(({ path }) => !path.includes('NaN'))).toBe(true);
  });

  test('flat picking respects holes, tiny source markers, Antarctica and antimeridian islands', () => {
    const camera = new FlatCamera();
    camera.resize(390, 844);
    camera.fit();
    for (const id of [
      'ca',
      'fr',
      'ru',
      'fj',
      'nz',
      'aq',
      'ls',
      ...world.markers.map(({ id }) => id),
    ]) {
      camera.focus(id);
      const point = camera.project(countryAnchors.get(id)!.anchor)!;
      expect(pickFlatCountry(camera, point[0], point[1])).toBe(id);
    }
    camera.fit();
    expect(pickFlatCountry(camera, 0, 0)).toBeNull();
    const ocean = camera.project([-30, 0])!;
    expect(pickFlatCountry(camera, ...(ocean as [number, number]))).toBeNull();
  });
});

describe('camera navigation', () => {
  test('location focus at either map edge does not jump on the first gesture', () => {
    const camera = new FlatCamera();
    camera.resize(390, 844);
    for (const longitude of [-179.9, 179.9]) {
      camera.focusLocation([longitude, 0]);
      const center = [...camera.center];
      camera.drag(0, 0);
      expect(camera.center).toEqual(center);
      const point = camera.project([longitude, 0])!;
      expect(point[0]).toBeGreaterThan(0);
      expect(point[0]).toBeLessThan(camera.width);
    }
  });

  test('globe rotation keeps an off-center pinch anchor under the fingers', () => {
    const camera = new GlobeCamera();
    camera.resize(390, 844);
    const anchor = camera.geographicPoint(270, 390)!;
    for (let index = 0; index < 20; index++) {
      camera.zoomAt(camera.zoom * 1.02, 270, 390);
      camera.twist(0.03, 270, 390);
      const point = camera.project(toCartesian(anchor))!;
      expect(point[0]).toBeCloseTo(270, 3);
      expect(point[1]).toBeCloseTo(390, 3);
    }
  });

  test('a zero-size layout does not consume flat-map initialization', () => {
    const camera = new FlatCamera();
    camera.start('fr');
    expect(camera.initialized).toBe(false);
    expect(Number.isFinite(camera.zoom)).toBe(true);
    camera.resize(390, 844);
    camera.start('fr');
    expect(camera.initialized).toBe(true);
    expect(camera.project(countryAnchors.get('fr')!.anchor)![0]).toBeCloseTo(
      195,
    );
  });

  test('globe pinch follows an off-center moving focal point', () => {
    const camera = new GlobeCamera();
    camera.resize(390, 844);
    const before = camera.geographicPoint(240, 450)!;
    camera.zoomAt(3, 265, 465, 240, 450);
    const after = camera.project(toCartesian(before))!;
    expect(after[0]).toBeCloseTo(265, 3);
    expect(after[1]).toBeCloseTo(465, 3);
    expect(Math.hypot(...camera.rotation)).toBeCloseTo(1, 5);
  });

  test('north up retains the globe center and zoom after drag and twist', () => {
    const camera = new GlobeCamera();
    camera.resize(390, 844);
    camera.drag(160, 100);
    camera.twist(1.4);
    camera.setZoom(3);
    const center = camera.geographicPoint(195, 422)!;
    camera.northUp();
    const after = camera.geographicPoint(195, 422)!;
    expect(after[0]).toBeCloseTo(center[0], 3);
    expect(after[1]).toBeCloseTo(center[1], 3);
    expect(camera.zoom).toBe(3);
    const north = camera.project(
      toCartesian([center[0], Math.min(center[1] + 1, 89)]),
    )!;
    expect(north[0]).toBeCloseTo(195, 3);
    expect(north[1]).toBeLessThan(422);
  });

  test('globe focus targets the main landmass and clamps tiny and polar places', () => {
    const camera = new GlobeCamera();
    camera.resize(390, 844);
    for (const id of ['fr', 'us', 'nz', 'aq', 'sg']) {
      const country = countryAnchors.get(id)!;
      camera.focus(country.anchor, country.angularRadius);
      const projected = camera.project(toCartesian(country.anchor))!;
      expect(projected[0]).toBeCloseTo(195, 3);
      expect(projected[1]).toBeCloseTo(422, 3);
      expect(camera.zoom).toBeGreaterThanOrEqual(1.2);
      expect(camera.zoom).toBeLessThanOrEqual(8);
    }
  });

  test('flat pinch keeps its focal country under the finger, with bounded panning and zoom', () => {
    const camera = new FlatCamera();
    camera.resize(390, 844);
    camera.focus('fr');
    const point = camera.geographicPoint(210, 400)!;
    camera.zoomAt(camera.zoom * 1.2, 240, 410, 210, 400);
    const after = camera.project(point)!;
    expect(after[0]).toBeCloseTo(240, 4);
    expect(after[1]).toBeCloseTo(410, 4);
    camera.zoomAt(100, 195, 422);
    const closePoint = camera.geographicPoint(210, 400)!;
    camera.zoomAt(200, 230, 410, 210, 400);
    const closeScreen = camera.project(closePoint)!;
    expect(closeScreen[0]).toBeCloseTo(230, 4);
    expect(closeScreen[1]).toBeCloseTo(410, 4);
    camera.drag(1e5, -1e5);
    expect(camera.center[0]).toBeGreaterThan(0);
    expect(camera.center[1]).toBeLessThanOrEqual(500);
    camera.zoomAt(1e9, 195, 422);
    expect(camera.zoom).toBe(200);
    camera.fit();
    expect(camera.zoom).toBe(1);
    expect(camera.center).toEqual([500, 250]);
    expect(camera.project([0, 0])![0]).toBeCloseTo(195);
  });

  test('portrait flat map starts immersed instead of a narrow band', () => {
    const camera = new FlatCamera();
    camera.resize(390, 844);
    camera.start(null);
    expect(camera.scale * 500).toBeCloseTo(844 * 0.8);
    camera.fit();
    expect(camera.scale * 1000).toBeCloseTo(390);
  });

  test.each([
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ])('vertical map edges can reach the middle on a $width-point iPhone', ({ width, height }) => {
    const camera = new FlatCamera();
    camera.resize(width, height);
    camera.start(null);
    for (const zoom of [1, camera.zoom, 20, 200]) {
      camera.zoomAt(zoom, width / 2, height / 2);
      camera.drag(0, 1e6);
      expect(camera.projectPoint([500, 0])[1]).toBeCloseTo(height / 2);
      camera.drag(0, 100);
      expect(camera.projectPoint([500, 0])[1]).toBeCloseTo(height / 2);

      camera.drag(0, -1e6);
      expect(camera.projectPoint([500, 500])[1]).toBeCloseTo(height / 2);
      camera.drag(0, -100);
      expect(camera.projectPoint([500, 500])[1]).toBeCloseTo(height / 2);
    }
    camera.resize(width, height - 40);
    expect(camera.projectPoint([500, 500])[1]).toBeCloseTo((height - 40) / 2);
    camera.fit();
    expect(camera.center).toEqual([500, 250]);
    expect(camera.zoom).toBe(1);
  });

  test('a local tap anchor keeps a large country callout visible without moving the globe', () => {
    const camera = new GlobeCamera();
    camera.resize(390, 844);
    camera.focus([-123, 54], 0.03);
    const rotation = Array.from(camera.rotation);
    const mainAnchor = camera.project(
      toCartesian(countryAnchors.get('ca')!.anchor),
    );
    expect(
      calloutRect(
        mainAnchor,
        { width: 240, height: 80 },
        { width: 390, height: 844, top: 130, bottom: 140 },
      ),
    ).toBeNull();
    const tappedAnchor = camera.geographicPoint(195, 422)!;
    const point = camera.project(toCartesian(tappedAnchor));
    expect(
      calloutRect(
        point,
        { width: 240, height: 80 },
        { width: 390, height: 844, top: 130, bottom: 140 },
      ),
    ).not.toBeNull();
    expect(Array.from(camera.rotation)).toEqual(rotation);
  });

  test('home initialization happens once; camera state survives mode remount and resizing', () => {
    const camera = new FlatCamera();
    camera.resize(390, 844);
    camera.start('fr');
    expect(camera.center[0]).toBeCloseTo(
      projection(countryAnchors.get('fr')!.anchor as [number, number])![0],
    );
    camera.drag(30, 10);
    const position = [...camera.center];
    camera.start('ca');
    expect(camera.center).toEqual(position);
    camera.resize(390, 844);
    expect(camera.center).toEqual(position);
  });
});

describe('map callouts and sparse labels', () => {
  const bounds = { width: 390, height: 844, top: 130, bottom: 140 };
  test('mounted labels follow the current camera throughout a drag and pinch', () => {
    const camera = new GlobeCamera();
    camera.resize(bounds.width, bounds.height);
    const candidates = ['fr', 'ca'].map((id) => ({
      ...countryAnchors.get(id)!,
      name: id,
    }));
    const project = (point: readonly number[]) =>
      camera.project(toCartesian(point));
    const frame = () =>
      placeLabels(
        projectLabels(candidates, project, camera.zoom),
        bounds,
        [],
      ).map(({ id }) => id);
    camera.focus(countryAnchors.get('fr')!.anchor, 0.1);
    expect(frame()).toContain('fr');
    expect(frame()).not.toContain('ca');
    camera.focus(countryAnchors.get('ca')!.anchor, 0.1);
    expect(frame()).toContain('ca');
    expect(frame()).not.toContain('fr');
    camera.setZoom(1.2);
    expect(frame()).toEqual([]);
    camera.setZoom(4);
    expect(frame()).toContain('ca');
  });

  test('native annotation transforms keep the same geographic position in RTL', () => {
    const rect = { x: 70, y: 200, width: 240, height: 80 };
    const ltr = annotationTranslation(rect, 390, false);
    const rtl = annotationTranslation(rect, 390, true);
    expect(ltr[0]).toBe(70);
    expect(390 - rect.width + rtl[0]).toBe(70);
    expect(ltr[1]).toBe(rtl[1]);
  });

  test('label collision bounds grow with Dynamic Type and long translations', () => {
    const [label] = placeLabels(
      [
        {
          id: 'long',
          name: 'A long translated country name',
          point: [195, 400],
        },
      ],
      bounds,
      [],
      1.4,
    );
    expect(label.width).toBeCloseTo(238);
    expect(label.height).toBeCloseTo(28);
    expect(label.x).toBeGreaterThanOrEqual(8);
    expect(label.x + label.width).toBeLessThanOrEqual(bounds.width - 8);
  });

  test('callouts flip and clamp within usable bounds, hiding offscreen anchors', () => {
    const size = { width: 240, height: 80 };
    expect(calloutRect([195, 150], size, bounds)!.y).toBe(164);
    expect(calloutRect([15, 400], size, bounds)!.x).toBe(8);
    expect(calloutRect([380, 400], size, bounds)!.x).toBe(142);
    expect(calloutRect(null, size, bounds)).toBeNull();
    expect(calloutRect([-5, 400], size, bounds)).toBeNull();
    expect(calloutRect([195, 800], size, bounds)).toBeNull();
    expect(
      calloutRect([195, 400], { width: 240, height: 1000 }, bounds),
    ).toBeNull();
  });

  test('labels cap at twelve and leave the callout and each other clear', () => {
    const blocked = { x: 120, y: 300, width: 150, height: 60 };
    const candidates = Array.from({ length: 30 }, (_, index) => ({
      id: String(index),
      name: 'Place',
      point: [70 + (index % 3) * 125, 180 + Math.floor(index / 3) * 54],
    }));
    const labels = placeLabels(candidates, bounds, [blocked]);
    expect(labels.length).toBe(12);
    // Measure the largest separating axis, independently of the collision helper.
    const separation = (a: Rect, b: Rect) =>
      Math.max(
        b.x - (a.x + a.width),
        a.x - (b.x + b.width),
        b.y - (a.y + a.height),
        a.y - (b.y + b.height),
      );
    labels.forEach((label, index) => {
      expect(separation(label, blocked)).toBeGreaterThanOrEqual(16);
      for (const other of labels.slice(index + 1))
        expect(separation(label, other)).toBeGreaterThanOrEqual(18);
    });
  });

  test('labels also leave a visible home marker clear', () => {
    const home = { x: 181, y: 386, width: 28, height: 28 };
    const callout = { x: 8, y: 520, width: 240, height: 80 };
    const labels = placeLabels(
      [
        { id: 'near-home', name: 'Home neighbor', point: [220, 400] },
        { id: 'near-callout', name: 'Selected neighbor', point: [195, 560] },
        { id: 'clear', name: 'Clear country', point: [195, 300] },
      ],
      bounds,
      [home, callout],
    );
    expect(labels.map(({ id }) => id)).toEqual(['clear']);
  });
});
