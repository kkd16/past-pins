import { describe, expect, test } from 'bun:test';

import { flatCountryById } from '../src/atlas/geography';
import { countryIds } from '../src/countries/catalog';
import { getStampOutline } from '../src/stamps/outline';

describe('stamp geography', () => {
  test('catalog countries have source outlines or a marker for degenerate geometry', () => {
    const markerIds: string[] = [];
    for (const id of countryIds) {
      const outline = getStampOutline(id);
      if (!outline) {
        markerIds.push(id);
        continue;
      }
      const [[left, top], [right, bottom]] = outline.bounds;
      expect([left, top, right, bottom].every(Number.isFinite)).toBe(true);
      expect(right).toBeGreaterThan(left);
      expect(bottom).toBeGreaterThan(top);
      for (const ring of outline.path.match(/M[^M]+/g) ?? [])
        expect(flatCountryById.get(id)!.path).toContain(ring);
      expect(outline.path).not.toContain('NaN');
      expect(outline.transform).not.toMatch(/NaN|Infinity/);
    }
    // This country collapses to a vertical line in the current atlas source.
    expect(markerIds).toEqual(['va']);
  });

  test('date-line countries focus on a contiguous landmass', () => {
    for (const id of ['ru', 'fj', 'nz']) {
      const [[left], [right]] = getStampOutline(id)!.bounds;
      expect(right - left).toBeLessThan(500);
    }
  });

  test('South Africa preserves its interior country boundary', () => {
    expect(getStampOutline('za')!.path.match(/M/g)?.length).toBe(2);
  });

  test('nearby islands remain recognizable together', () => {
    expect(getStampOutline('jp')!.path.match(/M/g)?.length).toBe(4);
    expect(getStampOutline('nz')!.path.match(/M/g)?.length).toBe(3);
    expect(getStampOutline('fj')!.path.match(/M/g)?.length).toBe(2);
    expect(getStampOutline('fr')!.path.match(/M/g)?.length).toBe(2);
  });

  test('unknown country IDs do not invent an outline', () => {
    expect(getStampOutline('unknown')).toBeUndefined();
  });

  test('empty paths and slivers use the same neutral marker', () => {
    const fixtures = [
      { id: 'stamp-empty-fixture', path: '' },
      { id: 'stamp-sliver-fixture', path: 'M0,0L100,0L100,0.1L0,0.1Z' },
    ];
    for (const fixture of fixtures) {
      flatCountryById.set(fixture.id, {
        ...fixture,
        bounds: [
          [0, 0],
          [100, 0.1],
        ],
      });
      try {
        expect(getStampOutline(fixture.id)).toBeUndefined();
      } finally {
        flatCountryById.delete(fixture.id);
      }
    }
  });
});
