import type { AppData } from '../data/model';
import { formatNumber, t } from '../localization';
import { formatPlaceName, getPlaces } from '../places/catalog';
import { getPlaceStatistics } from '../places/statistics';

export async function getBackupSummary(data: AppData): Promise<string> {
  const [home] = await getPlaces(data.homePlaceId ? [data.homePlaceId] : []).catch(() => []);
  return t('settings.replaceSummary', {
    countries: formatNumber(getPlaceStatistics(data.places, 'country').saved),
    regions: formatNumber(getPlaceStatistics(data.places, 'region').saved),
    cities: formatNumber(getPlaceStatistics(data.places, 'city').saved),
    lists: formatNumber(data.lists.length),
    home: home ? formatPlaceName(home) : t(data.homePlaceId ? 'settings.homeNameUnavailable' : 'common.none'),
  });
}
