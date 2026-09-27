import { DataError } from './data-error';
import { CURRENT_SCHEMA_VERSION, type AppData } from './model';
import { validateAppData } from './validation';

export function encodeDocument(data: AppData, formatted = false): string {
  return JSON.stringify(
    {
      app: 'past-pins',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      data: validateAppData(data),
    },
    null,
    formatted ? 2 : undefined,
  );
}

export function decodeDocument(text: string): AppData {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new DataError('invalid-document');
  }
  if (
    !value || typeof value !== 'object' || Array.isArray(value) ||
    !('app' in value) || value.app !== 'past-pins' ||
    !('schemaVersion' in value) || typeof value.schemaVersion !== 'number' ||
    !Number.isSafeInteger(value.schemaVersion) || value.schemaVersion < 1 ||
    !('data' in value) || Object.keys(value).length !== 3
  )
    throw new DataError('invalid-document');
  if (value.schemaVersion !== CURRENT_SCHEMA_VERSION)
    throw new DataError('unsupported-version', value.schemaVersion);
  try {
    return validateAppData(value.data);
  } catch (cause) {
    throw new DataError('invalid-document', value.schemaVersion, { cause });
  }
}
