import type { ComponentProps } from 'react';

import { Sheet } from '../components/Sheet';
import { countryById } from '../countries/catalog';
import { CountryDetailsContent } from '../countries/CountryDetailsContent';
import { t } from '../localization';

export function CountryDetailsScreen({
  onDone,
  ...props
}: Omit<ComponentProps<typeof CountryDetailsContent>, 'showOverview'> & {
  onDone: () => void;
}) {
  const country = countryById.get(props.id);
  return (
    <Sheet
      title={country?.name ?? t('countries.details.notFound')}
      subtitle={country?.continent.name}
      onDone={onDone}
    >
      <CountryDetailsContent {...props} />
    </Sheet>
  );
}
