import { t } from '../localization';
import { UserFacingError } from './errors';
import { countryIds } from '../countries/catalog';
import type { AppStorage } from '../storage/snapshot-storage';
import { validateAppData } from './backup';
import {
  changeHome,
  changePlaceStatus,
  defaultAppData,
  defaultPreferences,
  type AppData,
  type PlaceStatus,
  type Preferences,
  type TravelData,
} from './model';

export type DataSnapshot = {
  data: AppData;
  status: 'loading' | 'ready' | 'load-error';
  saveError: boolean;
  busy: boolean;
  undoLabel: string | null;
};

export function createAppDataStore(
  storage: AppStorage,
  effects: {
    confirmHomeChange: (id: string) => Promise<boolean>;
    feedback?: (enabled: boolean) => void;
  },
) {
  let snapshot: DataSnapshot = {
    data: defaultAppData(),
    status: 'loading',
    saveError: false,
    busy: false,
    undoLabel: null,
  };
  const listeners = new Set<() => void>();
  let undoTravel: TravelData | null = null;
  let revision = 0;
  let loading: Promise<void> | null = null;
  let lastWrite = Promise.resolve();

  function publish(patch: Partial<DataSnapshot>) {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  }

  function editable() {
    return snapshot.status === 'ready' && !snapshot.busy;
  }

  function persist(data: AppData) {
    const ownRevision = ++revision;
    function finish(saveError: boolean) {
      if (ownRevision === revision && saveError !== snapshot.saveError)
        publish({ saveError });
    }
    lastWrite = storage.save(data).then(
      () => finish(false),
      () => finish(true),
    );
  }

  function changeTravel(data: AppData, label: string) {
    if (data === snapshot.data) return;
    undoTravel = {
      places: snapshot.data.places,
      homeCountryId: snapshot.data.homeCountryId,
    };
    publish({ data, undoLabel: label });
    persist(data);
    effects.feedback?.(data.preferences.haptics);
  }

  function load(): Promise<void> {
    if (loading) return loading;
    if (snapshot.status === 'ready' || snapshot.busy) return Promise.resolve();
    publish({ status: 'loading' });
    loading = storage
      .load()
      .then(
        (data) => publish({ data, status: 'ready', saveError: false }),
        () => publish({ status: 'load-error' }),
      )
      .finally(() => {
        loading = null;
      });
    return loading;
  }

  async function replace(data: AppData) {
    if (snapshot.status === 'loading' || snapshot.busy)
      throw new UserFacingError(t('common.errors.dataNotReady'));
    const next = validateAppData(data);
    publish({ busy: true });
    try {
      await lastWrite;
      await storage.save(next);
      undoTravel = null;
      publish({
        data: next,
        status: 'ready',
        undoLabel: null,
        saveError: false,
      });
    } finally {
      publish({ busy: false });
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    load,
    async setStatus(
      ids: readonly string[],
      status: PlaceStatus,
      options?: { preserveLived?: boolean },
    ): Promise<boolean> {
      if (!editable()) return false;
      if (ids.some((id) => !countryIds.has(id)))
        throw new UserFacingError(t('common.errors.unknownCountry'));
      const next = changePlaceStatus(
        snapshot.data,
        ids,
        status,
        options?.preserveLived ?? true,
      );
      if (snapshot.data.homeCountryId && !next.homeCountryId) {
        publish({ busy: true });
        try {
          if (!(await effects.confirmHomeChange(snapshot.data.homeCountryId)))
            return false;
        } finally {
          publish({ busy: false });
        }
      }
      const count = [...new Set(ids)].filter(
        (id) => next.places[id] !== snapshot.data.places[id],
      ).length;
      changeTravel(next, t('common.placesUpdated', { count }));
      return true;
    },
    setHome(id: string | null) {
      if (!editable()) return;
      if (id !== null && !countryIds.has(id))
        throw new UserFacingError(t('common.errors.unknownCountry'));
      changeTravel(
        changeHome(snapshot.data, id),
        id ? t('common.homeUpdated') : t('common.homeCleared'),
      );
    },
    updatePreferences(patch: Partial<Preferences>) {
      if (!editable()) return;
      if (
        Object.entries(patch).every(
          ([key, value]) =>
            snapshot.data.preferences[key as keyof Preferences] === value,
        )
      )
        return;
      const data = {
        ...snapshot.data,
        preferences: { ...snapshot.data.preferences, ...patch },
      };
      publish({ data });
      persist(data);
    },
    undo() {
      if (!editable() || !undoTravel) return;
      const data = { ...snapshot.data, ...undoTravel };
      undoTravel = null;
      publish({ data, undoLabel: null });
      persist(data);
      effects.feedback?.(data.preferences.haptics);
    },
    retry() {
      if (snapshot.status === 'load-error') void load();
      else if (editable()) persist(snapshot.data);
    },
    restore: replace,
    async clearTravel() {
      if (!editable())
        throw new UserFacingError(t('common.errors.dataNotReady'));
      await replace({ ...snapshot.data, places: {}, homeCountryId: null });
    },
    resetPreferences() {
      if (!editable()) return;
      const data = { ...snapshot.data, preferences: { ...defaultPreferences } };
      undoTravel = null;
      publish({ data, undoLabel: null });
      persist(data);
    },
  };
}
