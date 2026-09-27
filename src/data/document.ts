import { DataError } from './data-error';
import { validateV1, type AppDataV1 } from './schemas/v1';

export type DataDocument<T = unknown> = {
  app: 'past-pins';
  schemaVersion: number;
  data: T;
};

export type Schema = {
  version: number;
  validate: (value: unknown) => unknown;
  upgrade?: (previous: unknown) => unknown;
};

export function createDocumentCodec<T>(schemas: readonly Schema[]) {
  if (!schemas.length || schemas.some((schema, index) =>
    schema.version !== index + 1 || typeof schema.validate !== 'function' ||
    (index > 0 ? typeof schema.upgrade !== 'function' : schema.upgrade !== undefined),
  )) throw new Error('Schemas must start at 1 and have consecutive, forward migration steps.');
  const currentVersion = schemas.length;

  function encode(data: T): DataDocument<T> {
    return {
      app: 'past-pins',
      schemaVersion: currentVersion,
      data: schemas[currentVersion - 1].validate(data) as T,
    };
  }

  function decode(text: string) {
    let value: unknown;
    try { value = JSON.parse(text); } catch { throw new DataError('invalid-document'); }
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
      !('app' in value) || value.app !== 'past-pins' ||
      !('schemaVersion' in value) || typeof value.schemaVersion !== 'number' ||
      !Number.isSafeInteger(value.schemaVersion) || value.schemaVersion < 1 ||
      !('data' in value) || Object.keys(value).length !== 3
    ) throw new DataError('invalid-document');
    const sourceVersion = value.schemaVersion;
    if (sourceVersion > currentVersion) throw new DataError('unsupported-version', sourceVersion);
    let data: unknown;
    try { data = schemas[sourceVersion - 1].validate(value.data); }
    catch (cause) { throw new DataError('invalid-document', sourceVersion, { cause }); }
    for (let index = sourceVersion; index < currentVersion; index++) {
      try { data = schemas[index].validate(schemas[index].upgrade!(data)); }
      catch (cause) { throw new DataError('migration-failed', sourceVersion, { cause }); }
    }
    return { data: data as T, sourceVersion, migrated: sourceVersion !== currentVersion };
  }
  return { currentVersion, encode, decode };
}

export const documentCodec = createDocumentCodec<AppDataV1>([
  { version: 1, validate: validateV1 },
]);
export const CURRENT_SCHEMA_VERSION = documentCodec.currentVersion;
