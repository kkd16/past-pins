import { countryIds } from '../countries/catalog';
import { countryAtPoint } from '../countries/geography';
import { isVisited } from '../data/model';
import type { DataSnapshot } from '../data/store';
import type { KeyValueStorage } from '../storage/snapshot-storage';

const STORAGE_KEY = 'country-arrivals';
const REMINDER_INTERVAL = 7 * 24 * 60 * 60 * 1000;
export const ARRIVAL_TYPE = 'country-arrival';

export type Arrival = { countryId: string; notifiedAt: number };
type ArrivalState = {
  countryId: string | null;
  observedAt: number;
  notifiedAt: Record<string, number>;
};
export type ArrivalLocation = {
  timestamp: number;
  coords: { longitude: number; latitude: number };
};

export function parseArrival(data: Record<string, unknown> | undefined): Arrival | null {
  return data?.type === ARRIVAL_TYPE &&
    typeof data.countryId === 'string' && countryIds.has(data.countryId) &&
    typeof data.notifiedAt === 'number' && Number.isFinite(data.notifiedAt) &&
    data.notifiedAt > 0
    ? { countryId: data.countryId, notifiedAt: data.notifiedAt }
    : null;
}

export function arrivalDataReady(snapshot: DataSnapshot) {
  return snapshot.status === 'ready' && !snapshot.busy && !snapshot.saveError &&
    snapshot.data.onboardingCompleted;
}

export function arrivalsEnabled(snapshot: DataSnapshot) {
  return arrivalDataReady(snapshot) && snapshot.data.preferences.countryArrivalAlerts;
}

export function createArrivalTracker(
  storage: Pick<KeyValueStorage, 'getItem' | 'setItem'>,
  getSnapshot: () => DataSnapshot,
  notifications: {
    send(arrival: Arrival): Promise<string | null>;
    remove(identifier: string): Promise<void>;
  },
) {
  let pending = Promise.resolve();

  async function read(): Promise<ArrivalState> {
    const text = await storage.getItem(STORAGE_KEY);
    if (text === null) return { countryId: null, observedAt: 0, notifiedAt: {} };
    const state = JSON.parse(text) as ArrivalState;
    if (!state ||
      (state.countryId !== null && !countryIds.has(state.countryId)) ||
      !Number.isFinite(state.observedAt) || state.observedAt < 0 ||
      !state.notifiedAt || typeof state.notifiedAt !== 'object' ||
      Array.isArray(state.notifiedAt) ||
      Object.entries(state.notifiedAt).some(([id, time]) =>
        !countryIds.has(id) || !Number.isFinite(time) || time <= 0,
      )
    ) throw new Error('Invalid country arrival state.');
    return state;
  }

  async function process(locations: readonly ArrivalLocation[]) {
    const snapshot = getSnapshot();
    const current = () => {
      const latest = getSnapshot();
      return arrivalsEnabled(latest) && latest.resetVersion === snapshot.resetVersion &&
        latest.data.places === snapshot.data.places;
    };
    if (!current()) return;
    // A deferred batch may contain places already passed through.
    const location = locations.reduce<ArrivalLocation | null>((latest, item) =>
      Number.isFinite(item.timestamp) &&
      Number.isFinite(item.coords.longitude) && Math.abs(item.coords.longitude) <= 180 &&
      Number.isFinite(item.coords.latitude) && Math.abs(item.coords.latitude) <= 90 &&
      (!latest || item.timestamp > latest.timestamp) ? item : latest,
    null);
    if (!location) return;
    const state = await read();
    if (!current() || location.timestamp <= state.observedAt) return;
    const detected = countryAtPoint([location.coords.longitude, location.coords.latitude]);
    // Remember observation order, but ocean is not evidence of a new country.
    const countryId = detected && countryIds.has(detected) ? detected : state.countryId;
    const now = Date.now();
    const previous = countryId ? state.notifiedAt[countryId] : undefined;
    const arrival = countryId && countryId !== state.countryId &&
      !isVisited(snapshot.data.places[countryId]) &&
      (previous === undefined || now - previous >= REMINDER_INTERVAL)
      ? { countryId, notifiedAt: now } : null;
    const next: ArrivalState = {
      countryId,
      observedAt: location.timestamp,
      notifiedAt: arrival ? { ...state.notifiedAt, [arrival.countryId]: now } : state.notifiedAt,
    };
    let notificationId: string | null = null;
    let keepNotification = false;
    try {
      if (arrival) {
        notificationId = await notifications.send(arrival);
        if (notificationId === null) return;
      }
      if (!current()) return;
      await storage.setItem(STORAGE_KEY, JSON.stringify(next));
      keepNotification = current();
    } finally {
      if (notificationId !== null && !keepNotification)
        await notifications.remove(notificationId);
    }
  }

  return {
    process(locations: readonly ArrivalLocation[]) {
      const result = pending.then(() => process(locations));
      pending = result.catch(() => undefined);
      return result;
    },
    async isCurrent(arrival: Arrival) {
      // A tap can arrive before the notification's bookkeeping finishes saving.
      await pending;
      const snapshot = getSnapshot();
      if (!arrivalsEnabled(snapshot)) return false;
      const state = await read();
      const latest = getSnapshot();
      return arrivalsEnabled(latest) && latest.data === snapshot.data &&
        state.notifiedAt[arrival.countryId] === arrival.notifiedAt;
    },
  };
}
