import { countries, countryById } from '../countries/catalog';
import { getTravelStatistics } from '../countries/statistics';
import type { Country } from '../countries/types';
import { getPlaceStatus, isVisited, type AppData } from '../data/model';
import { formatList, t } from '../localization';
import { formatPlaceName, getStaticPlace, type Place } from '../places/catalog';

export type ShareTarget =
  | { kind: 'world' }
  | { kind: 'list'; id: string }
  | { kind: 'stamp'; id: string };

export type ShareOptions = {
  includeWishlist: boolean;
  includeHome: boolean;
};

export const defaultShareOptions: Readonly<ShareOptions> = {
  includeWishlist: false,
  includeHome: false,
};

export type ShareContent =
  | {
      kind: 'world';
      places: AppData['places'];
      stats: ReturnType<typeof getTravelStatistics>;
      homeName?: string;
    }
  | {
      kind: 'list';
      name: string;
      places: Place[];
      visited: number;
    }
  | { kind: 'stamp'; country: Country; collected: boolean };

export function parseShareTarget(
  kind: unknown,
  id: unknown,
): ShareTarget | null {
  if (kind === 'world')
    return { kind: 'world' };
  if ((kind === 'list' || kind === 'stamp') && typeof id === 'string' && id)
    return { kind, id };
  return null;
}

export function getSharePlaceIds(data: AppData, target: ShareTarget | null, options: ShareOptions): readonly string[] {
  if (target?.kind === 'list') return data.lists.find(({ id }) => id === target.id)?.placeIds ?? [];
  if (target?.kind === 'world' && options.includeHome && data.homePlaceId) return [data.homePlaceId];
  return [];
}

export function getShareContent(
  data: AppData,
  target: ShareTarget | null,
  options: ShareOptions,
  resolvedPlaces: readonly Place[] = [],
): ShareContent | null {
  if (!target) return null;
  if (target.kind === 'stamp') {
    const country = countryById.get(target.id);
    return country
      ? {
          kind: 'stamp',
          country,
          collected: isVisited(data.places[country.id]),
        }
      : null;
  }
  if (target.kind === 'list') {
    const list = data.lists.find(({ id }) => id === target.id);
    if (!list) return null;
    const memberIds = new Set(list.placeIds);
    const places = resolvedPlaces.filter(
      (place) =>
        memberIds.has(place.id) &&
        (options.includeWishlist ||
          getPlaceStatus(data, place.id) !== 'wishlist'),
    );
    return {
      kind: 'list',
      name: list.name,
      places,
      visited: places.filter((place) => isVisited(getPlaceStatus(data, place.id)))
        .length,
    };
  }
  const home = data.homePlaceId
    ? resolvedPlaces.find(({ id }) => id === data.homePlaceId) ?? getStaticPlace(data.homePlaceId)
    : undefined;
  const places: AppData['places'] = {};
  for (const { id } of countries) {
    const status = data.places[id];
    if (!status || (status === 'wishlist' && !options.includeWishlist))
      continue;
    places[id] =
      status === 'lived' && !options.includeHome ? 'visited' : status;
  }
  return {
    kind: 'world',
    places,
    stats: getTravelStatistics(places),
    homeName:
      options.includeHome && home
        ? formatPlaceName(home)
        : undefined,
  };
}

export function getShareMapLabel(
  content: Exclude<ShareContent, { kind: 'stamp' }>,
) {
  if (content.kind === 'list')
    return t('sharing.listMapDescription', {
      places: formatList(content.places.map(formatPlaceName)),
    });
  const groups = (['visited', 'lived', 'wishlist'] as const).flatMap(
    (status) => {
      const names = countries
        .filter(({ id }) => content.places[id] === status)
        .map(({ name }) => name);
      return names.length
        ? [
            t('sharing.mapGroup', {
              status: t(`countries.status.${status}`),
              places: formatList(names),
            }),
          ]
        : [];
    },
  );
  return groups.length ? groups.join(' ') : t('sharing.emptyMap');
}
