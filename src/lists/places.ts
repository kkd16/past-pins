import { isVisited, type AppData, type TravelList } from '../data/model';
import { getPlace, getPlaceStatus } from '../places/catalog';

export function getListStatistics(list: TravelList, data: AppData) {
  let visited = 0;
  let total = 0;
  for (const id of list.placeIds) {
    const place = getPlace(id);
    if (!place) continue;
    total++;
    if (isVisited(getPlaceStatus(data, place))) visited++;
  }
  return { visited, total };
}
