export type Rect = { x: number; y: number; width: number; height: number };
export type ViewBounds = {
  width: number;
  height: number;
  top: number;
  bottom: number;
};

export function annotationTranslation(
  rect: Rect | null,
  width: number,
  rtl: boolean,
) {
  return rect ? [rtl ? rect.x + rect.width - width : rect.x, rect.y] : [0, 0];
}

function intersects(a: Rect, b: Rect, gap: number) {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  );
}

export function inBounds(point: readonly number[] | null, bounds: ViewBounds) {
  return (
    !!point &&
    point[0] >= 8 &&
    point[0] <= bounds.width - 8 &&
    point[1] >= bounds.top &&
    point[1] <= bounds.height - bounds.bottom
  );
}

export function labelSize(name: string, fontScale: number) {
  return {
    width: Math.min(170 * fontScale, name.length * 6.5 * fontScale + 12),
    height: 20 * fontScale,
  };
}

export function projectLabels(
  candidates: {
    id: string;
    name: string;
    area: number;
    anchor: readonly number[];
  }[],
  project: (point: readonly number[]) => number[] | null,
  zoom: number,
) {
  return zoom >= 1.6
    ? candidates
        .filter(({ area }) => area * zoom * zoom > 0.008)
        .map(({ id, name, anchor }) => ({ id, name, point: project(anchor) }))
    : [];
}

export function placeLabels(
  candidates: { id: string; name: string; point: number[] | null }[],
  bounds: ViewBounds,
  blocked: Rect[],
  fontScale = 1,
) {
  const result: (Rect & { id: string; name: string })[] = [];
  for (const candidate of candidates) {
    if (!inBounds(candidate.point, bounds) || !candidate.point) continue;
    const { width, height } = labelSize(candidate.name, fontScale);
    const rect = {
      x: candidate.point[0] - width / 2,
      y: candidate.point[1] - height / 2,
      width,
      height,
    };
    if (
      rect.x < 8 ||
      rect.x + width > bounds.width - 8 ||
      rect.y < bounds.top ||
      rect.y + rect.height > bounds.height - bounds.bottom
    )
      continue;
    if (
      blocked.some((other) => intersects(rect, other, 16)) ||
      result.some((other) => intersects(rect, other, 18))
    )
      continue;
    result.push({ ...rect, id: candidate.id, name: candidate.name });
    if (result.length === 12) break;
  }
  return result;
}
