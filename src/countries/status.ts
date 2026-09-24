import type { IconProps } from '../components/Icon';
import type { PlaceStatus } from '../data/model';
import { theme } from '../theme';

export const statusOptions: { value: PlaceStatus; label: string }[] = [
  { value: 'unvisited', label: 'Not marked' },
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'visited', label: 'Visited' },
  { value: 'lived', label: 'Lived' },
];

export function getStatusPresentation(
  status: PlaceStatus | undefined,
  isHome = false,
): {
  label: string;
  color: string;
  icon: IconProps['name'];
} {
  if (isHome)
    return { label: 'Current home', color: theme.color.lived, icon: 'home' };
  switch (status) {
    case 'visited':
      return {
        label: 'Visited',
        color: theme.color.visitedEmphasis,
        icon: 'check',
      };
    case 'wishlist':
      return { label: 'Wishlist', color: theme.color.wishlist, icon: 'star' };
    case 'lived':
      return { label: 'Lived', color: theme.color.lived, icon: 'pin' };
    default:
      return {
        label: 'Not visited',
        color: theme.color.textMuted,
        icon: 'pin',
      };
  }
}
