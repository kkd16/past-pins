import { describe, expect, test } from 'bun:test';

import config from '../app.json';
import { theme } from '../src/theme';

function luminance(hex: string) {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a: string, b: string) {
  const light = luminance(a);
  const dark = luminance(b);
  return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
}

describe('travel theme accessibility', () => {
  test('text stays readable on every content surface', () => {
    for (const background of [
      theme.color.background,
      theme.color.surface,
      theme.color.selectedSurface,
      theme.color.visitedSurface,
    ]) {
      for (const text of [
        theme.color.text,
        theme.color.textMuted,
        theme.color.accent,
        theme.color.visitedEmphasis,
      ])
        expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(
      contrast(theme.color.onAccent, theme.color.accent),
    ).toBeGreaterThanOrEqual(4.5);
  });

  test('visit controls and progress remain distinguishable', () => {
    for (const background of [
      theme.color.background,
      theme.color.surface,
      theme.color.visitedSurface,
    ]) {
      expect(
        contrast(theme.color.controlBorder, background),
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrast(theme.color.visitedEmphasis, background),
      ).toBeGreaterThanOrEqual(3);
    }
    expect(
      contrast(theme.color.visitedEmphasis, theme.color.border),
    ).toBeGreaterThanOrEqual(3);
    expect(
      contrast(theme.color.onVisited, theme.color.visited),
    ).toBeGreaterThanOrEqual(4.5);
  });

  test('land is distinct from water and native appearance matches the theme', () => {
    expect(
      contrast(theme.globe.land, theme.globe.ocean),
    ).toBeGreaterThanOrEqual(3);
    expect(config.expo.userInterfaceStyle).toBe(theme.appearance.colorScheme);
  });
});
