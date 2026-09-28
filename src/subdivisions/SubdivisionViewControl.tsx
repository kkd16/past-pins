import { ChoiceControl } from '../components/ChoiceControl';
import { t } from '../localization';

export type SubdivisionView = 'map' | 'list';

export function SubdivisionViewControl({ value, onChange }: {
  value: SubdivisionView;
  onChange: (value: SubdivisionView) => void;
}) {
  return (
    <ChoiceControl value={value} onChange={onChange} accessibilityLabel={t('subdivisions.viewLabel')}
      options={[
        { value: 'map', label: t('subdivisions.mapView') },
        { value: 'list', label: t('subdivisions.listView') },
      ]} />
  );
}
