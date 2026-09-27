export const DATA_ERROR_CODES = [
  'invalid-document',
  'unsupported-version',
  'storage-read',
  'storage-write',
  'reset-failed',
] as const;
export type DataErrorCode = typeof DATA_ERROR_CODES[number];

export class DataError extends Error {
  constructor(
    public readonly code: DataErrorCode,
    public readonly sourceVersion?: number,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = 'DataError';
  }
}

export function dataError(error: unknown, fallback: DataErrorCode): DataError {
  return error instanceof DataError ? error : new DataError(fallback, undefined, { cause: error });
}
