import { useAppData } from '../data/AppData';
import { formatPlaceName } from './catalog';
import { usePlaces } from './usePlaces';

export function useHome() {
  const id = useAppData(({ data, status }) => status === 'ready' ? data.homePlaceId : null);
  const { places, ...state } = usePlaces(id ? [id] : []);
  const place = places[0];
  return { ...state, id, place, name: place ? formatPlaceName(place) : undefined };
}
