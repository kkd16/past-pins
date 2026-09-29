import assert from 'node:assert/strict';
import { mock } from 'bun:test';
import { act, type ComponentProps } from 'react';
import { createRoot } from 'test-renderer';

import { arrivalStorage } from '../native-location';
import { native, navigation } from '../setup';
import type { PlaceStatus } from '../../src/data/model';
import { t } from '../../src/localization';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let chooseStatus: (status: PlaceStatus) => void;
mock.module('../../src/components/AppText', () => ({ AppText: 'Text' }));
mock.module('../../src/components/Button', () => ({ Button: 'Button' }));
mock.module('../../src/components/Surface', () => ({ Surface: 'Surface' }));
mock.module('../../src/components/AppPressable', () => ({ AppPressable: 'Pressable' }));
mock.module('../../src/components/Icon', () => ({ Icon: 'Icon' }));
mock.module('../../src/components/ToggleRow', () => ({ ToggleRow: 'ToggleRow' }));
mock.module('../../src/components/DataFeedback', () => ({ DataFeedback: 'DataFeedback' }));
mock.module('../../src/stamps/CountryStamp', () => ({ CountryStamp: 'CountryStamp' }));
mock.module('../../src/places/PlaceSelectionCard', () => ({ PlaceSelectionContent: 'PlaceSelection' }));
mock.module('../../src/countries/StatusPicker', () => ({
  showStatusPicker: (_title: string, onSelect: typeof chooseStatus) => {
    chooseStatus = onSelect;
  },
}));

const { appData } = await import('../../src/data/app-data');
const { AppDataEffects, useAppData } = await import('../../src/data/AppData');
const { CountryBulkActions } = await import('../../src/countries/CountryBulkActions');
const { CountryDetailsContent } = await import('../../src/countries/CountryDetailsContent');
const root = createRoot({ isStrictMode: true });
const scenario = process.argv[2];
if (scenario !== 'load recovery') await appData.load();

async function settle() {
  await arrivalStorage.load();
  await Promise.resolve();
}

async function subscriptions() {
  const renders = { data: 0, places: 0, actions: 0, busy: 0 };
  const values: Record<string, unknown> = {};
  function Data() {
    values.data = useAppData((snapshot) => snapshot.data);
    renders.data++;
    return null;
  }
  function Places() {
    values.places = useAppData((snapshot) => snapshot.data.places);
    renders.places++;
    return null;
  }
  function Actions() {
    values.actions = appData;
    renders.actions++;
    return null;
  }
  function Busy() {
    values.busy = useAppData((snapshot) => snapshot.busy);
    renders.busy++;
    return null;
  }
  await act(async () => root.render(
    <><AppDataEffects /><Data /><Places /><Actions /><Busy /></>,
  ));
  const actions = renders.actions;
  await act(async () => { await appData.setStatus(['ca'], 'visited'); await settle(); });
  assert.deepEqual(values.places, { ca: 'visited' });
  const beforePreferences = { ...renders };
  await act(async () => { appData.updatePreferences({ haptics: false }); await settle(); });
  assert.equal(renders.places, beforePreferences.places, 'Preferences must not rerender place consumers');
  assert.ok(renders.data > beforePreferences.data);
  await act(async () => { appData.setHome('ca'); await settle(); });
  const beforePrompt = { ...renders };
  let changing: Promise<boolean>;
  await act(async () => { changing = appData.setStatus(['ca'], 'unvisited'); });
  assert.equal(values.busy, true);
  assert.equal(renders.places, beforePrompt.places, 'Busy state must not rerender place consumers');
  assert.equal(renders.data, beforePrompt.data);
  await act(async () => { native.Alert.alert.mock.lastCall![2]![0].onPress!(); await changing; });
  assert.equal(values.busy, false);
  assert.equal(renders.actions, actions, 'Action-only consumers must not rerender on data changes');
  assert.equal(values.actions, appData);

  const beforeFailure = { ...renders };
  const save = arrivalStorage.save;
  arrivalStorage.save = async () => { throw new Error('Storage unavailable'); };
  await act(async () => { appData.retry(); await settle(); });
  assert.equal(appData.getSnapshot().saveError, true);
  assert.equal(renders.places, beforeFailure.places, 'Save feedback must not rerender place consumers');
  assert.equal(renders.data, beforeFailure.data);
  assert.equal(native.AccessibilityInfo.announceForAccessibilityWithOptions.mock.calls.length, 1);
  assert.equal(native.AccessibilityInfo.announceForAccessibilityWithOptions.mock.lastCall![0], t('countries.saveError'));
  arrivalStorage.save = save;
  await act(async () => { appData.retry(); await settle(); });
  assert.equal(appData.getSnapshot().saveError, false);

  let place: PlaceStatus;
  function Place({ id }: { id: string }) {
    place = useAppData((snapshot) => snapshot.data.places[id] ?? 'unvisited');
    return null;
  }
  await act(async () => root.render(<><AppDataEffects /><Place id="ca" /></>));
  assert.equal(place!, 'lived');
  await act(async () => root.render(<><AppDataEffects /><Place id="fr" /></>));
  assert.equal(place!, 'unvisited');
  await act(async () => { await appData.setStatus(['fr'], 'wishlist'); await settle(); });
  assert.equal(place!, 'wishlist');
}

async function loadRecovery() {
  const load = arrivalStorage.load;
  arrivalStorage.load = async () => { throw new Error('Unavailable storage'); };
  const statuses: string[] = [];
  function Status() {
    statuses.push(useAppData((snapshot) => snapshot.status));
    return null;
  }
  await act(async () => root.render(<><AppDataEffects /><Status /></>));
  assert.ok(statuses.includes('loading'));
  assert.equal(statuses.at(-1), 'load-error');
  assert.equal(native.AccessibilityInfo.announceForAccessibilityWithOptions.mock.lastCall![0], t('countries.loadError'));
  arrivalStorage.load = load;
  await act(async () => { appData.retry(); await appData.load(); });
  assert.equal(statuses.at(-1), 'ready');
  assert.equal(appData.getSnapshot().loadError, undefined);
}

async function confirmation(transition: string, details: boolean) {
  appData.setHome('ca');
  await settle();
  const before = appData.getSnapshot();
  const saved = await arrivalStorage.readRaw();
  const onEndSelection = mock();
  let countryId = 'ca';
  let props: ComponentProps<typeof CountryBulkActions> = {
    resultIds: ['ca', 'fr'], selectedIds: new Set(['ca']),
    onSelectionChange: mock(), onEndSelection,
  };
  async function render() {
    await act(async () => root.render(
      <><AppDataEffects />
        {details ? <CountryDetailsContent id={countryId} /> : <CountryBulkActions {...props} />}
      </>,
    ));
  }
  await render();
  if (details) {
    const [selection] = root.container.queryAll((node) => node.type === 'PlaceSelection');
    await act(async () => selection.props.onChangeStatus('unvisited'));
  } else {
    const [update] = root.container.queryAll((node) =>
      node.type === 'Button' && node.props.label === t('countries.updateCount', { count: 1, amount: '1' }),
    );
    assert.ok(update);
    await act(async () => update.props.onPress());
    await act(async () => chooseStatus('unvisited'));
  }
  assert.equal(appData.getSnapshot().busy, true, 'The second native confirmation is pending');
  const confirm = native.Alert.alert.mock.lastCall![2]![1].onPress!;
  if (transition === 'selection change') {
    countryId = 'fr';
    props = { ...props, selectedIds: new Set(['fr']) };
    await render();
  } else if (transition === 'screen blur') {
    navigation.focused = false;
    await render();
  } else if (transition === 'unmount') {
    await act(async () => root.unmount());
  }
  await act(async () => { confirm(); await settle(); });
  assert.equal(appData.getSnapshot().busy, false);
  if (transition === 'confirmed') {
    assert.equal(appData.getSnapshot().data.homePlaceId, null);
    assert.equal(appData.getSnapshot().data.places.ca, undefined);
    assert.deepEqual(await arrivalStorage.load(), appData.getSnapshot().data);
    assert.equal(onEndSelection.mock.calls.length, details ? 0 : 1);
  } else {
    assert.deepEqual(appData.getSnapshot(), before, 'A stale native confirmation must preserve data');
    assert.equal(await arrivalStorage.readRaw(), saved, 'No stale action may reach persistence');
    assert.equal(onEndSelection.mock.calls.length, 0);
  }
}

try {
  if (scenario === 'subscriptions') await subscriptions();
  else if (scenario === 'load recovery') await loadRecovery();
  else await confirmation(scenario.replace(/^details:/, ''), scenario.startsWith('details:'));
} finally {
  await act(async () => root.unmount());
}
process.stdout.write('passed');
