import { afterEach, beforeEach, expect, mock, test } from 'bun:test';
import {
  act,
  createElement,
  useImperativeHandle,
  type ComponentProps,
  type ReactNode,
  type Ref,
} from 'react';
import { createRoot, type Root } from 'test-renderer';

import { countryById } from '../src/countries/catalog';
import { defaultAppData } from '../src/data/model';
import { t } from '../src/localization';

// Keep React's real effects/unmount lifecycle. Native animation and scrolling
// are boundaries here; recognition and finger tracking still need an iPhone.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const collapse = mock();
const expand = mock();
const scrollTo = mock();
const setStatus = mock();
const setHome = mock();
const router = { push: mock(), dismissTo: mock(), back: mock() };
let routeId = 'ca';
let reducedMotion = false;
let appStatus: 'ready' | 'loading' | 'load-error' = 'ready';

mock.module('expo-router', () => ({
  router,
  useLocalSearchParams: () => ({ id: routeId }),
}));
mock.module('react-native-reanimated', () => ({
  ReduceMotion: { Always: 'always', Never: 'never' },
}));
mock.module('@gorhom/bottom-sheet', () => ({
  default: function BottomSheet({
    ref,
    ...props
  }: { ref: Ref<unknown>; children?: ReactNode }) {
    useImperativeHandle(ref, () => ({ collapse, expand }), []);
    return createElement('BottomSheet', props);
  },
  BottomSheetScrollView: function ScrollView({
    ref,
    ...props
  }: { ref: Ref<unknown>; children?: ReactNode }) {
    useImperativeHandle(ref, () => ({ scrollTo }), []);
    return createElement('ScrollView', props);
  },
  BottomSheetBackdrop: 'Backdrop',
  BottomSheetHandle: 'Handle',
  useBottomSheet: () => ({ animatedIndex: { value: 0 }, collapse, expand }),
}));
mock.module('../src/components/AppPressable', () => ({
  AppPressable: 'Pressable',
}));
mock.module('../src/components/Button', () => ({ Button: 'Button' }));
mock.module('../src/components/AppText', () => ({ AppText: 'Text' }));
mock.module('../src/components/Icon', () => ({ Icon: 'Icon' }));
mock.module('../src/components/Surface', () => ({ Surface: 'Surface' }));
mock.module('../src/components/ToggleRow', () => ({ ToggleRow: 'ToggleRow' }));
mock.module('../src/stamps/CountryStamp', () => ({ CountryStamp: 'CountryStamp' }));
mock.module('../src/components/DataFeedback', () => ({
  DataFeedback: 'DataFeedback',
}));
mock.module('../src/data/AppDataProvider', () => ({
  useAppData: () => ({
    data: defaultAppData(),
    status: appStatus,
    busy: false,
    setStatus,
    setHome,
  }),
}));
mock.module('../src/motion/ReducedMotion', () => ({
  useReducedMotion: () => reducedMotion,
}));
mock.module('../src/places/PlaceSelectionCard', () => ({
  PlaceSelectionContent: 'PlaceSelection',
}));
const { CountryMapSheet } = await import('../src/countries/CountryMapSheet');
const { default: CountryDetailsRoute } = await import('../src/app/country/[id]');
type Props = ComponentProps<typeof CountryMapSheet>;
let root: Root;
let props: Props;

beforeEach(() => {
  collapse.mockClear();
  expand.mockClear();
  scrollTo.mockClear();
  setStatus.mockClear();
  setHome.mockClear();
  for (const action of Object.values(router)) action.mockClear();
  reducedMotion = false;
  appStatus = 'ready';
  root = createRoot({ isStrictMode: true });
  props = {
    id: 'ca',
    containerHeight: 700,
    topInset: 60,
    bottomInset: 20,
    autofocus: false,
    onDismiss: mock(),
    onPreviewHeightChange: mock(),
  };
});

afterEach(async () => {
  await act(async () => root.unmount());
});

async function render(changes: Partial<Props> = {}) {
  props = { ...props, ...changes };
  await act(async () => {
    root.render(<CountryMapSheet key={props.id} {...props} />);
  });
}

function element(type: string, label?: string) {
  const matches = root.container.queryAll((node) =>
    node.type === type && (label === undefined || node.props.label === label),
  );
  expect(matches).toHaveLength(1);
  return matches[0];
}

function detailsHidden() {
  const views = root.container.queryAll((node) =>
    node.props.accessibilityElementsHidden !== undefined,
  );
  expect(views).toHaveLength(1);
  return views[0].props.accessibilityElementsHidden;
}

async function renderDetails(id = props.id) {
  routeId = id;
  await act(async () => {
    root.render(<CountryDetailsRoute />);
  });
}

async function settle(index: number) {
  await act(async () => element('BottomSheet').props.onChange(index));
}

test.each([false, true])(
  'collapsing returns to the heading even without an animation-start callback (Reduce Motion: %s)',
  async (reduceMotion) => {
    reducedMotion = reduceMotion;
    await render();
    expect(element('BottomSheet').props.overrideReduceMotion).toBe(
      reduceMotion ? 'always' : 'never',
    );
    await settle(0);
    await act(async () => element('PlaceSelection').props.onDetails());
    expect(expand).toHaveBeenCalledTimes(1);
    await settle(1);
    expect(element('PlaceSelection').props.expanded).toBe(true);
    expect(detailsHidden()).toBe(false);
    scrollTo.mockClear();

    // A fast native transition can settle before onAnimate reaches JS.
    await act(async () => element('PlaceSelection').props.onDetails());
    expect(collapse).toHaveBeenCalledTimes(1);
    await settle(0);
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
    expect(element('PlaceSelection').props.expanded).toBe(false);
    expect(detailsHidden()).toBe(true);
    expect(props.onDismiss).not.toHaveBeenCalled();
  },
);

test('a queued close from the previous country cannot dismiss its replacement', async () => {
  await render();
  const oldClose = element('BottomSheet').props.onClose;
  const oldChange = element('BottomSheet').props.onChange;
  await render({ id: 'fr' });
  await settle(1);
  scrollTo.mockClear();

  await act(async () => {
    oldChange(0);
    oldClose();
  });
  expect(props.onDismiss).not.toHaveBeenCalled();
  expect(scrollTo).not.toHaveBeenCalled();
  expect(element('PlaceSelection').props.title).toBe(countryById.get('fr')!.name);
  expect(element('PlaceSelection').props.expanded).toBe(true);

  await act(async () => element('BottomSheet').props.onClose());
  expect(props.onDismiss).toHaveBeenCalledTimes(1);
});

test('each Show on map request collapses the existing card for the same country', async () => {
  await render();
  await settle(1);
  expect(collapse).not.toHaveBeenCalled();
  await render({ focusRequest: 'navigation:first' });
  expect(collapse).toHaveBeenCalledTimes(1);
  await settle(0);
  await render({ focusRequest: undefined });
  expect(collapse).toHaveBeenCalledTimes(1);

  await settle(1);
  await render({ focusRequest: 'navigation:second' });
  expect(collapse).toHaveBeenCalledTimes(2);
  expect(props.onDismiss).not.toHaveBeenCalled();
});

test('VoiceOver follows screen focus and collapses before dismissing', async () => {
  await render({ autofocus: true });
  expect(element('PlaceSelection').props.autofocus).toBe(false);
  await settle(0);
  expect(element('PlaceSelection').props.autofocus).toBe(true);
  await render({ autofocus: false });
  await settle(1);
  expect(element('PlaceSelection').props.autofocus).toBe(false);
  await act(async () => element('PlaceSelection').props.onEscape());
  expect(collapse).toHaveBeenCalledTimes(1);
  expect(props.onDismiss).not.toHaveBeenCalled();
  await settle(0);
  await act(async () => element('PlaceSelection').props.onEscape());
  expect(props.onDismiss).toHaveBeenCalledTimes(1);
});

test.each(['map', 'list'])('country actions work from the %s card', async (entry) => {
  if (entry === 'map') {
    await render();
    await settle(1);
  } else {
    await renderDetails();
  }
  const country = countryById.get(props.id)!;
  const header = element('PlaceSelection');
  expect(header.props.title).toBe(country.name);
  expect(header.props.subtitle).toBe(country.continent.name);
  expect(detailsHidden()).toBe(false);
  expect(element('CountryStamp').props.country.id).toBe(props.id);

  await act(async () => {
    header.props.onChangeStatus('visited');
    header.props.onSaveToLists();
    element('ToggleRow').props.onValueChange(true);
    element('Button', t('sharing.stampAction')).props.onPress();
    element('CountryStamp').parent?.props.onPress();
    const regions = root.container.queryAll((node) =>
      node.type === 'Pressable' && node.props.accessibilityValue !== undefined,
    );
    expect(regions).toHaveLength(1);
    regions[0].props.onPress();
    element('Button', t('countries.details.showMap')).props.onPress();
    header.props.onDismiss();
  });

  expect(setStatus).toHaveBeenCalledWith([props.id], 'visited', {
    preserveLived: false,
  });
  expect(setHome).toHaveBeenCalledWith(props.id);
  expect(router.push.mock.calls).toEqual([
    [{ pathname: '/lists/add', params: { placeId: props.id } }],
    [{ pathname: '/share', params: { kind: 'stamp', id: props.id } }],
    [{ pathname: '/stamps/[id]', params: { id: props.id } }],
    [{ pathname: '/regions/[id]', params: { id: props.id, focus: undefined, scope: 'all' } }],
  ]);
  if (entry === 'map') {
    expect(collapse).toHaveBeenCalledTimes(1);
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
  } else {
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.dismissTo).toHaveBeenCalledWith({
      pathname: '/',
      params: { focus: props.id, focusRequest: expect.any(String) },
    });
  }
});

test.each(['loading', 'load-error'] as const)(
  'country details keep dismissal available without showing a false status during %s',
  async (status) => {
    appStatus = status;
    await renderDetails();
    const header = element('PlaceSelection');
    expect(header.props.status).toBeUndefined();
    expect(header.props.disabled).toBe(true);
    expect(root.container.queryAll((node) => node.type === 'CountryStamp')).toHaveLength(0);
    expect(root.container.queryAll((node) => node.type === 'ToggleRow')).toHaveLength(0);
    await act(async () => header.props.onDismiss());
    expect(router.back).toHaveBeenCalledTimes(1);
  },
);

test('an invalid country route can still be dismissed', async () => {
  await renderDetails('missing-country');
  await act(async () => element('Button', t('common.done')).props.onPress());
  expect(router.back).toHaveBeenCalledTimes(1);
});
