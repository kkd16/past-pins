import { memo } from 'react';
import { CheckRow } from '../components/CheckRow';
import type { Country, CountryId } from './types';

export const CountryRow = memo(function CountryRow({
  country,
  visited,
  disabled,
  onVisitedChange,
}: {
  country: Country;
  visited: boolean;
  disabled: boolean;
  onVisitedChange: (id: CountryId, visited: boolean) => void;
}) {
  return (
    <CheckRow
      label={country.name}
      checked={visited}
      disabled={disabled}
      onCheckedChange={(checked) => onVisitedChange(country.id, checked)}
    />
  );
});
