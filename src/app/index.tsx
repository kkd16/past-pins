import { CountriesScreen } from '../screens/CountriesScreen';
import { visitStorage } from '../storage/visits';

export default function HomeScreen() {
  return <CountriesScreen storage={visitStorage} />;
}
