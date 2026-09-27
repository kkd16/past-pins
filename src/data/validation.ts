import { countryIds } from '../countries/catalog';
import { subdivisionIds } from '../subdivisions/catalog';
import { t } from '../localization';
import { UserFacingError } from './errors';
import { MAX_LIST_NAME_LENGTH } from './model';

export { validateV1 as validateAppData } from './schemas/v1';

export function validateListName(value: string): string {
  const name = value.trim();
  if (!name || name.length > MAX_LIST_NAME_LENGTH || /[\r\n]/.test(name))
    throw new UserFacingError(
      t('common.errors.invalidListName', { count: MAX_LIST_NAME_LENGTH }),
    );
  return name;
}

export function validateListPlaces(ids: readonly string[]): string[] {
  if (ids.some((id) => !countryIds.has(id) && !subdivisionIds.has(id)))
    throw new UserFacingError(t('common.errors.unknownListPlace'));
  return [...new Set(ids)];
}
