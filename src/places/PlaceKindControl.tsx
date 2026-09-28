import { ChoiceControl } from '../components/ChoiceControl';
import { t } from '../localization';

export type PlacesMode = 'countries' | 'regions' | 'cities';

export function PlaceKindControl({ value, onChange }: {
  value: PlacesMode;
  onChange: (value: PlacesMode) => void;
}) {
  return (
    <ChoiceControl value={value} onChange={onChange} accessibilityLabel={t('places.modeLabel')}
      options={[
        { value: 'countries', label: t('places.countries') },
        { value: 'regions', label: t('places.regions') },
        { value: 'cities', label: t('places.cities') },
      ]} />
  );
}
