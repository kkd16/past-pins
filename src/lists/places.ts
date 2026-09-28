import { isVisited, type AppData, type TravelList } from '../data/model';

export function getListStatistics(list: TravelList, data: AppData) {
  return {
    visited: list.placeIds.filter((id) => isVisited(data.places[id])).length,
    total: list.placeIds.length,
  };
}
