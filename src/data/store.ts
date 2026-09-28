import { t } from '../localization';
import { UserFacingError } from './errors';
import { countryIds } from '../countries/catalog';
import { dataError, type DataError } from './data-error';
import type { AppStorage, SaveOptions } from '../storage/snapshot-storage';
import {
  validateAppData,
  validateListName,
  validateListPlaces,
} from './validation';
import {
  changeHome,
  changePlaceStatus,
  defaultAppData,
  defaultPreferences,
  type AppData,
  type PlaceStatus,
  isVisited,
  type Preferences,
  type TravelList,
} from './model';
import { isPlaceId } from './place-hierarchy';

export type StatusChangeConfirmation = {
  descendants: number;
  homeCountryId: string | null;
  status: PlaceStatus;
};

export type DataSnapshot = {
  data: AppData;
  status: 'loading' | 'ready' | 'load-error';
  saveError: boolean;
  loadError?: DataError;
  recovery?: boolean;
  busy: boolean;
  resetVersion: number;
};

export function createAppDataStore(
  storage: AppStorage,
  effects: {
    confirmStatusChange: (change: StatusChangeConfirmation) => Promise<boolean>;
    feedback?: (enabled: boolean) => void;
    report?: (operation: 'load' | 'save' | 'reset' | 'restore', error: DataError) => void;
  },
) {
  let snapshot: DataSnapshot = {
    data: defaultAppData(),
    status: 'loading',
    saveError: false,
    busy: false,
    resetVersion: 0,
  };
  const listeners = new Set<() => void>();
  let revision = 0;
  let loading: Promise<void> | null = null;
  let lastWrite = Promise.resolve();
  let listSequence = 0;

  function publish(patch: Partial<DataSnapshot>) {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  }

  function editable() {
    return snapshot.status === 'ready' && !snapshot.busy && !snapshot.recovery;
  }

  function persist(data: AppData) {
    const ownRevision = ++revision;
    function finish(saveError: boolean) {
      if (ownRevision === revision && saveError !== snapshot.saveError)
        publish({ saveError });
    }
    lastWrite = storage.save(data).then(
      () => finish(false),
      (error) => {
        effects.report?.('save', dataError(error, 'storage-write'));
        finish(true);
      },
    );
  }

  function changeTravel(data: AppData) {
    if (data === snapshot.data) return;
    publish({ data });
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
        (data) => publish({ data, status: 'ready', saveError: false, loadError: undefined }),
        (error) => {
          const failure = dataError(error, 'storage-read');
          effects.report?.('load', failure);
          publish({ status: 'load-error', loadError: failure });
        },
      )
      .finally(() => {
        loading = null;
      });
    return loading;
  }

  async function replace(data: AppData, { reset = false, ...options }: SaveOptions & { reset?: boolean } = {}) {
    if (snapshot.status === 'loading' || snapshot.busy)
      throw new UserFacingError(t('common.errors.dataNotReady'));
    publish({ busy: true });
    try {
      await lastWrite;
      if (reset) await storage.clear();
      else await storage.save(data, options);
      ++revision;
      publish({
        data,
        status: 'ready',
        saveError: false,
        loadError: undefined,
        resetVersion: snapshot.resetVersion + (reset ? 1 : 0),
      });
    } catch (error) {
      effects.report?.(reset ? 'reset' : 'restore', dataError(error, reset ? 'reset-failed' : 'storage-write'));
      throw error;
    } finally {
      publish({ busy: false });
    }
  }

  function updateList(id: string, update: (list: TravelList) => TravelList): boolean {
    if (!editable()) return false;
    const list = snapshot.data.lists.find((list) => list.id === id);
    if (!list) return false;
    const next = update(list);
    if (next !== list) changeTravel({
      ...snapshot.data,
      lists: snapshot.data.lists.map((item) => item === list ? next : item),
    });
    return true;
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
    enterRecovery() { publish({ recovery: true }); },
    leaveRecovery() { publish({ recovery: false }); },
    async completeOnboarding(countryArrivalAlerts: boolean) {
      if (!editable())
        throw new UserFacingError(t('common.errors.dataNotReady'));
      if (snapshot.data.onboardingCompleted) return;
      await replace({
        ...snapshot.data,
        onboardingCompleted: true,
        preferences: { ...snapshot.data.preferences, countryArrivalAlerts },
      });
    },
    async setStatus(
      ids: readonly string[],
      status: PlaceStatus,
      options?: { preserveLived?: boolean; isCurrent?: () => boolean },
    ): Promise<boolean> {
      const isCurrent = options?.isCurrent ?? (() => true);
      if (!editable() || !isCurrent()) return false;
      if (ids.some((id) => !isPlaceId(id)))
        throw new UserFacingError(t('common.errors.unknownPlace'));
      const next = changePlaceStatus(
        snapshot.data,
        ids,
        status,
        options?.preserveLived ?? true,
      );
      if (next === snapshot.data) return true;
      const targets = new Set(ids);
      const descendants = Object.entries(snapshot.data.places).filter(
        ([id, current]) => !targets.has(id) && isVisited(current) &&
          current !== next.places[id] &&
          (current === 'lived' || !isVisited(next.places[id])),
      ).length;
      const homeCountryId = snapshot.data.homeCountryId && !next.homeCountryId
        ? snapshot.data.homeCountryId
        : null;
      if (descendants || homeCountryId) {
        publish({ busy: true });
        try {
          if (!(await effects.confirmStatusChange({ descendants, homeCountryId, status })))
            return false;
        } finally {
          publish({ busy: false });
        }
        if (!editable() || !isCurrent()) return false;
      }
      changeTravel(next);
      return true;
    },
    createList(name: string, placeIds: readonly string[] = []): string | null {
      if (!editable()) return null;
      const listName = validateListName(name);
      const members = validateListPlaces(placeIds);
      let id: string;
      do {
        id = `list-${Date.now().toString(36)}-${(++listSequence).toString(36)}`;
      } while (snapshot.data.lists.some((list) => list.id === id));
      changeTravel(
        {
          ...snapshot.data,
          lists: [
            ...snapshot.data.lists,
            { id, name: listName, placeIds: members },
          ],
        },
      );
      return id;
    },
    renameList(id: string, name: string): boolean {
      return updateList(id, (list) => {
        const nextName = validateListName(name);
        return list.name === nextName ? list : { ...list, name: nextName };
      });
    },
    setListPlaces(id: string, placeIds: readonly string[]): boolean {
      return updateList(id, (list) => {
        const members = validateListPlaces(placeIds);
        return members.length === list.placeIds.length &&
          members.every((member, index) => member === list.placeIds[index])
          ? list
          : { ...list, placeIds: members };
      });
    },
    toggleListPlace(id: string, placeId: string): boolean {
      return updateList(id, (list) => ({
        ...list,
        placeIds: validateListPlaces(list.placeIds.includes(placeId)
          ? list.placeIds.filter((member) => member !== placeId)
          : [...list.placeIds, placeId]),
      }));
    },
    deleteList(id: string): boolean {
      if (!editable()) return false;
      const lists = snapshot.data.lists.filter((list) => list.id !== id);
      if (lists.length === snapshot.data.lists.length) return false;
      changeTravel({ ...snapshot.data, lists });
      return true;
    },
    setHome(id: string | null) {
      if (!editable()) return;
      if (id !== null && !countryIds.has(id))
        throw new UserFacingError(t('common.errors.unknownCountry'));
      changeTravel(changeHome(snapshot.data, id));
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
    retry() {
      if (snapshot.status === 'load-error') void load();
      else if (editable()) persist(snapshot.data);
    },
    async restore(data: AppData) {
      const next = validateAppData(data);
      next.onboardingCompleted ||= snapshot.data.onboardingCompleted;
      await replace(next, { checkpoints: 'create' });
    },
    resetApp: () => replace(defaultAppData(), { reset: true }),
    async clearTravel() {
      if (!editable())
        throw new UserFacingError(t('common.errors.dataNotReady'));
      await replace({
        ...snapshot.data,
        places: {},
        lists: [],
        homeCountryId: null,
      }, { checkpoints: 'discard' });
    },
    async resetPreferences() {
      if (!editable()) throw new UserFacingError(t('common.errors.dataNotReady'));
      await replace({ ...snapshot.data, preferences: { ...defaultPreferences } });
    },
  };
}
