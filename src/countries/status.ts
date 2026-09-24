import type { IconProps } from '../components/Icon';
import type { PlaceStatus } from '../data/model';
import { theme } from '../theme';
import { t } from '../localization';

export const statusOptions: { value: PlaceStatus; label: string }[] = [
  { value: 'unvisited', label: t('countries.status.unmarked') },
  { value: 'wishlist', label: t('countries.status.wishlist') },
  { value: 'visited', label: t('countries.status.visited') },
  { value: 'lived', label: t('countries.status.lived') },
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
    return {
      label: t('countries.status.home'),
      color: theme.color.lived,
      icon: 'home',
    };
  switch (status) {
    case 'visited':
      return {
        label: t('countries.status.visited'),
        color: theme.color.visitedEmphasis,
        icon: 'check',
      };
    case 'wishlist':
      return {
        label: t('countries.status.wishlist'),
        color: theme.color.wishlist,
        icon: 'star',
      };
    case 'lived':
      return {
        label: t('countries.status.lived'),
        color: theme.color.lived,
        icon: 'pin',
      };
    default:
      return {
        label: t('countries.status.notVisited'),
        color: theme.color.textMuted,
        icon: 'pin',
      };
  }
}
