import { CountriesScreen } from '../countries/CountriesScreen';
import { visitStorage } from '../storage/visits';

export default function HomeScreen() {
  return <CountriesScreen storage={visitStorage} />;
}
