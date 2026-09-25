import { describe, expect, test } from 'bun:test';

import {
  SubdivisionCamera,
  pickSubdivision,
  subdivisionPickShapes,
} from '../src/subdivisions/map-layout';
import { getSubdivisionMap } from '../src/subdivisions/geography';
import { subdivisionsByCountry } from '../src/subdivisions/catalog';
import type { SubdivisionMapRegion } from '../src/subdivisions/types';

const map = { width: 1000, height: 700 };

describe('subdivision map selection focus', () => {
  test('centers SVG coordinates within the available map height', () => {
    const camera = new SubdivisionCamera(map);
    camera.resize(350, 280);
    expect(camera.scale).toBeCloseTo(0.35);
    const phoneTopLeft = camera.projectPoint([0, 0]);
    expect(phoneTopLeft[0]).toBeCloseTo(0);
    expect(phoneTopLeft[1]).toBeCloseTo(17.5);
    camera.resize(350, 220);
    expect(camera.scale).toBeCloseTo(220 / 700);
    const topLeft = camera.projectPoint([0, 0]);
    expect(topLeft[0]).toBeCloseTo((350 - (1000 * 220) / 700) / 2);
    expect(topLeft[1]).toBeCloseTo(0);
  });

  test('keeps a selected region visible with breathing room', () => {
    const camera = new SubdivisionCamera(map);
    camera.resize(350, 280);
    const bounds = [
      [400, 200],
      [600, 400],
    ];
    camera.focus(bounds);
    const topLeft = camera.projectPoint(bounds[0]);
    const bottomRight = camera.projectPoint(bounds[1]);
    expect(topLeft[0]).toBeGreaterThan(camera.width * 0.13);
    expect(topLeft[1]).toBeGreaterThan(camera.height * 0.13);
    expect(bottomRight[0]).toBeLessThan(camera.width * 0.87);
    expect(bottomRight[1]).toBeLessThan(camera.height * 0.87);
  });

  test('tiny edge regions do not zoom past the limit or pan outside the country', () => {
    const camera = new SubdivisionCamera(map);
    camera.resize(350, 220);
    for (const bounds of [
      [
        [0, 0],
        [0.1, 0.1],
      ],
      [
        [999.9, 699.9],
        [1000, 700],
      ],
      [
        [500, 350],
        [500, 350],
      ],
    ]) {
      camera.focus(bounds);
      expect(camera.zoom).toBe(60);
      const topLeft = camera.unprojectScreen(0, 0);
      const bottomRight = camera.unprojectScreen(camera.width, camera.height);
      expect(topLeft[0]).toBeGreaterThanOrEqual(0);
      expect(topLeft[1]).toBeGreaterThanOrEqual(0);
      expect(bottomRight[0]).toBeLessThanOrEqual(map.width);
      expect(bottomRight[1]).toBeLessThanOrEqual(map.height);
    }
  });

  test('a whole-country selection fits rather than zooming out past minimum scale', () => {
    const camera = new SubdivisionCamera(map);
    camera.resize(350, 280);
    camera.focus([
      [0, 0],
      [1000, 700],
    ]);
    expect(camera.zoom).toBe(1);
    expect(camera.center).toEqual([500, 350]);
  });

  test('waits for a usable native layout', () => {
    const camera = new SubdivisionCamera(map);
    camera.resize(0, 280);
    camera.focus([
      [0, 0],
      [1, 1],
    ]);
    expect(camera.scale).toBe(0);
    expect(camera.zoom).toBe(1);
    camera.resize(350, 0);
    camera.focus([
      [0, 0],
      [1, 1],
    ]);
    expect(camera.scale).toBe(0);
    expect(camera.zoom).toBe(1);
  });

  test('initial mainland focus waits for layout and does not replace later navigation', () => {
    const camera = new SubdivisionCamera(getSubdivisionMap('fr')!);
    camera.start();
    expect(camera.initialized).toBe(false);
    camera.resize(350, 280);
    camera.start();
    expect(camera.initialized).toBe(true);
    expect(camera.zoom).toBeGreaterThan(2);
    camera.zoomAt(6, 175, 140);
    camera.drag(15, 10);
    const center = [...camera.center];
    const zoom = camera.zoom;
    camera.resize(350, 300);
    camera.start();
    expect(camera.center).toEqual(center);
    expect(camera.zoom).toBe(zoom);
  });
});

describe('subdivision map gestures and picking', () => {
  test('deep pinches preserve the focal point, clamp, and reset', () => {
    const camera = new SubdivisionCamera(map);
    camera.resize(350, 280);
    camera.zoomAt(300, 175, 140);
    expect(camera.zoom).toBe(300);
    const point = camera.unprojectScreen(190, 130);
    camera.zoomAt(600, 210, 150, 190, 130);
    const after = camera.projectPoint(point);
    expect(after[0]).toBeCloseTo(210);
    expect(after[1]).toBeCloseTo(150);
    camera.zoomAt(1e9, 175, 140);
    expect(camera.zoom).toBe(600);
    camera.fit();
    expect(camera.zoom).toBe(1);
    expect(camera.center).toEqual([500, 350]);
  });

  test('pinching follows a moving focal point without mirroring geographic coordinates', () => {
    const camera = new SubdivisionCamera(map);
    camera.resize(350, 280);
    camera.zoomAt(3, 175, 140);
    const point = camera.unprojectScreen(220, 130);
    camera.zoomAt(4, 235, 150, 220, 130);
    const after = camera.projectPoint(point);
    expect(after[0]).toBeCloseTo(235);
    expect(after[1]).toBeCloseTo(150);
    expect(camera.projectPoint([700, 350])[0]).toBeGreaterThan(
      camera.projectPoint([300, 350])[0],
    );
    const [scale, , , , tx, ty] = camera.matrix;
    expect(point[0] * scale + tx).toBeCloseTo(after[0]);
    expect(point[1] * scale + ty).toBeCloseTo(after[1]);
  });

  test('focus can be repeated after reset and panning stays inside map bounds', () => {
    const camera = new SubdivisionCamera(map);
    camera.resize(350, 280);
    const bounds = [
      [400, 200],
      [600, 400],
    ];
    camera.focus(bounds);
    const focused = [...camera.matrix];
    expect(camera.zoom).toBeGreaterThan(1);
    camera.fit();
    expect(camera.zoom).toBe(1);
    camera.focus(bounds);
    expect(camera.matrix).toEqual(focused);
    camera.drag(1e8, -1e8);
    const topLeft = camera.unprojectScreen(0, 0);
    const bottomRight = camera.unprojectScreen(camera.width, camera.height);
    expect(topLeft[0]).toBeGreaterThanOrEqual(0);
    expect(bottomRight[1]).toBeLessThanOrEqual(map.height);
  });

  test('picking respects holes, disconnected islands, and tiny visible markers', () => {
    const regions: SubdivisionMapRegion[] = [
      {
        id: 'main',
        path: 'M100,100L400,100L400,400L100,400ZM200,200L300,200L300,300L200,300ZM600,100L700,100L700,200L600,200Z',
        bounds: [
          [100, 100],
          [700, 400],
        ],
        point: [150, 150],
      },
      {
        id: 'tiny',
        path: 'M900,600L901,600L901,601L900,601Z',
        bounds: [
          [900, 600],
          [901, 601],
        ],
        point: [900.5, 600.5],
      },
    ];
    const camera = new SubdivisionCamera(map);
    camera.resize(350, 280);
    const shapes = subdivisionPickShapes(regions);
    const pick = (point: number[]) => {
      const [x, y] = camera.projectPoint(point);
      return pickSubdivision(camera, shapes, x, y);
    };
    expect(pick([150, 150])).toBe('main');
    expect(pick([250, 250])).toBeNull();
    expect(pick([650, 150])).toBe('main');
    expect(pick([901, 602])).toBe('tiny');
    expect(pick([800, 500])).toBeNull();
  });

  test('actual source-generated regions remain selectable after focus', () => {
    for (const id of subdivisionsByCountry.keys()) {
      const data = getSubdivisionMap(id)!;
      const camera = new SubdivisionCamera(data);
      const shapes = subdivisionPickShapes(data.regions);
      for (const region of shapes) {
        expect(region.path).toMatch(/^[MLZ\d,.\-]+$/);
        for (const [width, height] of [
          [350, 280],
          [288, 220],
        ]) {
          camera.resize(width, height);
          camera.focus(region.bounds);
          const [x, y] = camera.projectPoint(region.point);
          expect(x).toBeGreaterThanOrEqual(0);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(width);
          expect(y).toBeLessThanOrEqual(height);
          expect(pickSubdivision(camera, shapes, x, y)).toBe(region.id);
        }
      }
    }
  });

  test('source mainland focus leaves overseas regions reachable with fit and selection', () => {
    const data = getSubdivisionMap('fr')!;
    const camera = new SubdivisionCamera(data);
    camera.resize(350, 280);
    camera.focus(data.focusBounds);
    expect(camera.zoom).toBeGreaterThan(2);
    camera.fit();
    expect(camera.zoom).toBe(1);
    const bottomRight = camera.projectPoint([data.width, data.height]);
    expect(bottomRight[0]).toBeLessThanOrEqual(camera.width);
    expect(bottomRight[1]).toBeLessThanOrEqual(camera.height);
    for (const region of data.regions) {
      camera.focus(region.bounds);
      const point = camera.projectPoint(region.point);
      expect(point[0]).toBeGreaterThanOrEqual(0);
      expect(point[0]).toBeLessThanOrEqual(camera.width);
      expect(point[1]).toBeGreaterThanOrEqual(0);
      expect(point[1]).toBeLessThanOrEqual(camera.height);
    }
  });
});
