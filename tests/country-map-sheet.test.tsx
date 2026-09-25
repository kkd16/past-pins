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
let reducedMotion = false;
let appStatus: 'ready' | 'loading' | 'load-error' = 'ready';

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
const { CountryDetailsScreen } = await import('../src/screens/CountryDetailsScreen');
type Props = ComponentProps<typeof CountryMapSheet>;
let root: Root;
let props: Props;

beforeEach(() => {
  collapse.mockClear();
  expand.mockClear();
  scrollTo.mockClear();
  setStatus.mockClear();
  setHome.mockClear();
  reducedMotion = false;
  appStatus = 'ready';
  root = createRoot({ isStrictMode: true });
  props = {
    country: countryById.get('ca')!,
    containerHeight: 700,
    topInset: 60,
    bottomInset: 20,
    autofocus: false,
    onDismiss: mock(),
    onPreviewHeightChange: mock(),
    onOpenRegions: mock(),
    onSaveToLists: mock(),
    onShareStamp: mock(),
    onEnlargeStamp: mock(),
  };
});

afterEach(async () => {
  await act(async () => root.unmount());
});

async function render(changes: Partial<Props> = {}) {
  props = { ...props, ...changes };
  await act(async () => {
    root.render(<CountryMapSheet key={props.country.id} {...props} />);
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

async function renderDetails(id = props.country.id) {
  const showMap = mock();
  await act(async () => {
    root.render(
      <CountryDetailsScreen
        id={id}
        onDismiss={props.onDismiss}
        onShowMap={showMap}
        onOpenRegions={props.onOpenRegions}
        onSaveToLists={props.onSaveToLists}
        onShareStamp={() => props.onShareStamp(id)}
        onEnlargeStamp={() => props.onEnlargeStamp(id)}
      />,
    );
  });
  return showMap;
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
  await render({ country: countryById.get('fr')! });
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

test('VoiceOver waits for the card to appear and follows screen focus', async () => {
  await render({ autofocus: true });
  expect(element('PlaceSelection').props.autofocus).toBe(false);
  await settle(0);
  expect(element('PlaceSelection').props.autofocus).toBe(true);
  await render({ autofocus: false });
  await settle(1);
  expect(element('PlaceSelection').props.autofocus).toBe(false);
});

test.each(['map', 'list'])('country actions work from the %s card', async (entry) => {
  let showMap;
  if (entry === 'map') {
    await render();
    await settle(1);
  } else {
    showMap = await renderDetails();
  }
  const header = element('PlaceSelection');
  expect(header.props.title).toBe(props.country.name);
  expect(header.props.subtitle).toBe(props.country.continent.name);
  expect(detailsHidden()).toBe(false);
  expect(element('CountryStamp').props.country.id).toBe(props.country.id);

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

  expect(setStatus).toHaveBeenCalledWith([props.country.id], 'visited', {
    preserveLived: false,
  });
  expect(setHome).toHaveBeenCalledWith(props.country.id);
  expect(props.onSaveToLists).toHaveBeenCalledWith(props.country.id);
  expect(props.onOpenRegions).toHaveBeenCalledWith(props.country.id);
  expect(props.onShareStamp).toHaveBeenCalledWith(props.country.id);
  expect(props.onEnlargeStamp).toHaveBeenCalledWith(props.country.id);
  expect(props.onDismiss).toHaveBeenCalledTimes(1);
  if (entry === 'map') expect(collapse).toHaveBeenCalledTimes(1);
  else expect(showMap).toHaveBeenCalledWith(props.country.id);
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
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  },
);

test('an invalid country route can still be dismissed', async () => {
  await renderDetails('missing-country');
  await act(async () => element('Button', t('common.done')).props.onPress());
  expect(props.onDismiss).toHaveBeenCalledTimes(1);
});
