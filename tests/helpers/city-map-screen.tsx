import { expect, mock, spyOn } from 'bun:test';
import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'test-renderer';

import { defaultAppData } from '../../src/data/model';
import type { DataSnapshot } from '../../src/data/store';
import type { Place } from '../../src/places/catalog';
import { navigation } from '../setup';
import '../native-location';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const city: Extract<Place, { kind: 'city' }> = {
  id: 'city:6167865',
  name: 'Toronto',
  kind: 'city',
  countryId: 'ca',
  countryName: 'Canada',
  regionName: 'Ontario',
  coordinates: [-79.3832, 43.6532],
};
let data = defaultAppData();
let catalog = { places: [] as Place[], loading: false, error: false, retry: mock() };
const empty = { places: [], loading: false, error: false, retry: mock() };
mock.module('../../src/data/AppData', () => ({
  useAppData: <T,>(select: (snapshot: DataSnapshot) => T) => select({
    data, status: 'ready', busy: false, saveError: false, resetVersion: 0,
  }),
}));
mock.module('../../src/places/usePlaces', () => ({
  usePlaces: (ids: readonly string[]) => ids.length ? catalog : empty,
}));
mock.module('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
mock.module('../../src/accessibility/useScreenReaderEnabled', () => ({
  useScreenReaderEnabled: () => false,
}));
mock.module('../../src/atlas/WorldMapViewport', () => ({ WorldMapViewport: 'WorldMap' }));
mock.module('../../src/globe/GlobeViewport', () => ({ GlobeViewport: 'Globe' }));
mock.module('../../src/atlas/MapToolbar', () => ({ MapToolbar: 'MapToolbar' }));
mock.module('../../src/atlas/MapSummary', () => ({ MapSummary: 'MapSummary' }));
mock.module('../../src/countries/CountryMapSheet', () => ({ CountryMapSheet: 'CountryMapSheet' }));
mock.module('../../src/components/DataFeedback', () => ({ DataFeedback: 'DataFeedback' }));
mock.module('../../src/places/PlaceFeedback', () => ({ PlaceFeedback: 'PlaceFeedback' }));
mock.module('../../src/places/PlaceSelectionCard', () => ({
  PlaceSelectionCard: 'PlaceSelectionCard',
  PlaceSelectionContent: 'PlaceSelectionContent',
}));

const { appData } = await import('../../src/data/app-data');
const { MapScreen } = await import('../../src/screens/MapScreen');
type Props = ComponentProps<typeof MapScreen>;
let root: Root;
let props: Props;
const setStatus = spyOn(appData, 'setStatus').mockResolvedValue(true);

function setup() {
  data = defaultAppData();
  catalog = { places: [], loading: true, error: false, retry: mock() };
  navigation.focused = true;
  for (const action of Object.values(navigation.router)) action.mockClear();
  root = createRoot({ isStrictMode: true });
  props = {
    focus: city.id,
    focusRequest: 'first',
    onFocusConsumed: mock(),
    onOpenCountries: mock(),
    onSearch: mock(),
    onShare: mock(),
  };
}

async function render(changes: Partial<Props> = {}) {
  props = { ...props, ...changes };
  await act(async () => root.render(<MapScreen {...props} />));
}

function element(type: string) {
  const matches = root.container.queryAll((node) => node.type === type);
  expect(matches).toHaveLength(1);
  return matches[0];
}

async function cityFocus(mode: 'map' | 'globe') {
  data.preferences.mapView = mode;
  await render();
  const viewport = mode === 'map' ? 'WorldMap' : 'Globe';
  expect(element('PlaceFeedback').props.loading).toBe(true);
  expect(element(viewport).props.command).toBeNull();
  catalog = { ...catalog, places: [city], loading: false };
  await render();
  expect(element(viewport).props.command).toEqual({
    type: 'location', point: city.coordinates, key: 'navigation:first',
  });
  expect(element(viewport).props.selectedAnchor).toEqual(city.coordinates);
  expect(element(viewport).props.selectedId).toBe(city.id);
  await act(async () => element(viewport).props.onCommandApplied('navigation:first'));
  expect(props.onFocusConsumed).toHaveBeenCalledTimes(1);
  await render({ focus: undefined, focusRequest: undefined });
  const card = element('PlaceSelectionCard');
  expect(card.props.title).toBe(city.name);
  expect(card.props.subtitle).toBe('Ontario, Canada');
  expect(card.props.status).toBe('unvisited');
  await act(async () => {
    card.props.onChangeStatus('visited');
    card.props.onSaveToLists();
  });
  expect(setStatus).toHaveBeenCalledWith([city.id], 'visited', {
    preserveLived: false, isCurrent: expect.any(Function),
  });
  expect(navigation.router.push).toHaveBeenCalledWith({
    pathname: '/lists/add', params: { placeId: city.id },
  });
  await act(async () => card.props.onDismiss());
  expect(element(viewport).props.selectedId).toBeNull();
  expect(root.container.queryAll((node) => node.type === 'PlaceSelectionCard')).toHaveLength(0);
}

async function pendingFocus() {
  data.preferences.mapView = 'map';
  await render();
  await act(async () => element('WorldMap').props.onSelect('ca', [-100, 55]));
  expect(props.onFocusConsumed).toHaveBeenCalledTimes(1);
  await render({ focus: undefined, focusRequest: undefined });
  catalog = { ...catalog, places: [city], loading: false };
  await render();
  expect(element('WorldMap').props.selectedId).toBe('ca');
  expect(element('WorldMap').props.selectedAnchor).toEqual([-100, 55]);
  expect(element('WorldMap').props.command).toBeNull();
}

async function failedLookup() {
  catalog = { ...catalog, loading: false, error: true };
  await render();
  expect(element('PlaceFeedback').props.error).toBe(true);
  expect(root.container.queryAll((node) => node.type === 'PlaceSelectionCard')).toHaveLength(0);
  await act(async () => element('PlaceFeedback').props.onRetry());
  expect(catalog.retry).toHaveBeenCalledTimes(1);
}

async function switchMode() {
  const updatePreferences = spyOn(appData, 'updatePreferences').mockImplementation((patch) => {
    data = { ...data, preferences: { ...data.preferences, ...patch } };
  });
  try {
    data.preferences.mapView = 'map';
    catalog = { ...catalog, places: [city], loading: false };
    await render();
    await act(async () => element('WorldMap').props.onCommandApplied('navigation:first'));
    await render({ focus: undefined, focusRequest: undefined });
    for (const mode of ['globe', 'map'] as const) {
      await act(async () => element('MapToolbar').props.onChangeMode(mode));
      const viewport = element(mode === 'globe' ? 'Globe' : 'WorldMap');
      expect(viewport.props.active).toBe(true);
      expect(viewport.props.command).toMatchObject({ type: 'location', point: city.coordinates });
      expect(viewport.props.selectedId).toBe(city.id);
      expect(viewport.props.selectedAnchor).toEqual(city.coordinates);
      await act(async () => viewport.props.onCommandApplied(viewport.props.command.key));
    }
  } finally {
    updatePreferences.mockRestore();
  }
}

setup();
try {
  const scenario = process.argv[2];
  if (scenario === 'map' || scenario === 'globe') await cityFocus(scenario);
  else if (scenario === 'pending') await pendingFocus();
  else if (scenario === 'failure') await failedLookup();
  else if (scenario === 'switch-mode') await switchMode();
  else throw new Error('Unknown city map scenario');
  process.stdout.write('passed');
} finally {
  await act(async () => root.unmount());
  setStatus.mockRestore();
}
