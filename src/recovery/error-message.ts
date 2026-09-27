import { DataError } from '../data/data-error';
import { UserFacingError } from '../data/errors';
import { t } from '../localization';

export function recoveryMessage(error: unknown) {
  if (error instanceof DataError) return t(`recovery.errors.${error.code}`);
  if (error instanceof UserFacingError) return error.message;
  return t('common.unknownError');
}
