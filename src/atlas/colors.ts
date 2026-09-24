import type { SavedStatus } from '../data/model';
import { theme } from '../theme';

export function countryColor(
  status: SavedStatus | undefined,
  selected: boolean,
) {
  return selected
    ? theme.globe.selected
    : status
      ? theme.globe[status]
      : theme.globe.land;
}
