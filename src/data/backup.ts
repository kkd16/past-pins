import { t } from '../localization';
import { UserFacingError } from './errors';
import type { AppData } from './model';
import { validateAppData } from './validation';

export function encodeBackup(data: AppData): string {
  return JSON.stringify(
    { app: 'past-pins', version: 1, data: validateAppData(data) },
    null,
    2,
  );
}

export function decodeBackup(text: string): AppData {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new UserFacingError(t('common.errors.invalidJson'));
  }
  if (
    typeof value !== 'object' ||
    value === null ||
    !('app' in value) ||
    value.app !== 'past-pins' ||
    !('version' in value) ||
    value.version !== 1 ||
    !('data' in value) ||
    Object.keys(value).length !== 3
  ) {
    throw new UserFacingError(t('common.errors.invalidBackup'));
  }
  return validateAppData(value.data);
}
