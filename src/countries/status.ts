import type { IconProps } from '../components/Icon';
import type { PlaceStatus } from '../data/model';
import { theme } from '../theme';
import { t } from '../localization';

export const statusOptions: { value: PlaceStatus; label: string }[] = (
  ['visited', 'wishlist', 'unvisited', 'lived'] as const
).map((value) => ({ value, label: getStatusPresentation(value).label }));

export function getStatusPresentation(
  status: PlaceStatus | undefined,
  isHome = false,
): {
  label: string;
  color: string;
  backgroundColor: string;
  icon: IconProps['name'];
} {
  if (isHome)
    return {
      label: t('countries.status.home'),
      color: theme.color.lived,
      backgroundColor: theme.color.surfaceCool,
      icon: 'home',
    };
  switch (status) {
    case 'visited':
      return {
        label: t('countries.status.visited'),
        color: theme.color.visitedEmphasis,
        backgroundColor: theme.color.visitedSurface,
        icon: 'check',
      };
    case 'wishlist':
      return {
        label: t('countries.status.wishlist'),
        color: theme.color.wishlist,
        backgroundColor: theme.color.surfaceWarm,
        icon: 'star',
      };
    case 'lived':
      return {
        label: t('countries.status.lived'),
        color: theme.color.lived,
        backgroundColor: theme.color.surfaceCool,
        icon: 'pin',
      };
    default:
      return {
        label: t('countries.status.notVisited'),
        color: theme.color.textMuted,
        backgroundColor: theme.color.surface,
        icon: 'pin',
      };
  }
}
