import { CURRENT_SCHEMA_VERSION } from '../data/document';
import { DATA_ERROR_CODES, DataError } from '../data/data-error';

const operations = ['load', 'save', 'restore', 'reset', 'render', 'reminders', 'export'] as const;
const codes = [...DATA_ERROR_CODES, 'unexpected'] as const;
export type DiagnosticOperation = typeof operations[number];
type Event = {
  timestamp: number;
  appVersion: string | null;
  build: string | null;
  operation: DiagnosticOperation;
  code: typeof codes[number];
  schemaVersion: number;
  sourceVersion?: number;
};
const LIMIT = 50;

function sanitize(value: unknown): Event | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as Event;
  if (!Number.isSafeInteger(event.timestamp) || event.timestamp < 0 ||
    !operations.includes(event.operation) || !codes.includes(event.code) ||
    !Number.isSafeInteger(event.schemaVersion) || event.schemaVersion < 1) return null;
  return {
    timestamp: event.timestamp,
    appVersion: typeof event.appVersion === 'string' && /^[0-9.]{1,40}$/.test(event.appVersion) ? event.appVersion : null,
    build: typeof event.build === 'string' && /^[0-9.]{1,40}$/.test(event.build) ? event.build : null,
    operation: event.operation,
    code: event.code,
    schemaVersion: event.schemaVersion,
    ...(Number.isSafeInteger(event.sourceVersion) && event.sourceVersion! > 0
      ? { sourceVersion: event.sourceVersion } : {}),
  };
}

export function createDiagnosticLog(storage: {
  read(): Promise<string | null>;
  write(text: string): Promise<void>;
  clear(): Promise<void>;
}, version: { appVersion: string | null; build: string | null } = { appVersion: null, build: null }) {
  let pending = Promise.resolve();
  let events: Event[] | undefined;
  async function read() {
    if (events) return events;
    try {
      const parsed: unknown = JSON.parse(await storage.read() ?? '[]');
      events = Array.isArray(parsed) ? parsed.map(sanitize).filter((event): event is Event => event !== null).slice(-LIMIT) : [];
    } catch { events = []; }
    return events;
  }
  return {
    record(operation: DiagnosticOperation, error: unknown) {
      const event = sanitize({
        timestamp: Date.now(), ...version, operation, schemaVersion: CURRENT_SCHEMA_VERSION,
        code: error instanceof DataError && codes.includes(error.code) ? error.code : 'unexpected',
        sourceVersion: error instanceof DataError ? error.sourceVersion : undefined,
      });
      if (!event) return;
      pending = pending.then(async () => {
        events = [...await read(), event].slice(-LIMIT);
        await storage.write(JSON.stringify(events));
      }).catch(() => undefined);
    },
    async export() {
      await pending;
      return JSON.stringify({ app: 'past-pins', ...version, schemaVersion: CURRENT_SCHEMA_VERSION, events: await read() }, null, 2);
    },
    async clear() {
      const clearing = pending.then(async () => { await storage.clear(); events = []; });
      pending = clearing.catch(() => undefined);
      await clearing;
    },
  };
}
