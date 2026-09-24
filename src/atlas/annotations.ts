export type Rect = { x: number; y: number; width: number; height: number };
export type ViewBounds = {
  width: number;
  height: number;
  top: number;
  bottom: number;
};

export function intersects(a: Rect, b: Rect, gap = 8) {
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

export function calloutRect(
  point: readonly number[] | null,
  size: { width: number; height: number },
  bounds: ViewBounds,
): Rect | null {
  if (!inBounds(point, bounds) || !point) return null;
  if (size.height > bounds.height - bounds.top - bounds.bottom) return null;
  const above = point[1] - size.height - 14;
  const y =
    above >= bounds.top
      ? above
      : Math.min(point[1] + 14, bounds.height - bounds.bottom - size.height);
  return {
    x: Math.max(
      8,
      Math.min(bounds.width - size.width - 8, point[0] - size.width / 2),
    ),
    y,
    ...size,
  };
}

export function placeLabels(
  candidates: { id: string; name: string; point: number[] | null }[],
  bounds: ViewBounds,
  blocked: Rect | null,
) {
  const result: (Rect & { id: string; name: string })[] = [];
  for (const candidate of candidates) {
    if (!inBounds(candidate.point, bounds) || !candidate.point) continue;
    const width = Math.min(170, candidate.name.length * 6.5 + 12);
    const rect = {
      x: candidate.point[0] - width / 2,
      y: candidate.point[1] - 10,
      width,
      height: 20,
    };
    if (
      rect.x < 8 ||
      rect.x + width > bounds.width - 8 ||
      rect.y < bounds.top ||
      rect.y + rect.height > bounds.height - bounds.bottom
    )
      continue;
    if (
      (blocked && intersects(rect, blocked, 16)) ||
      result.some((other) => intersects(rect, other, 18))
    )
      continue;
    result.push({ ...rect, id: candidate.id, name: candidate.name });
    if (result.length === 12) break;
  }
  return result;
}
