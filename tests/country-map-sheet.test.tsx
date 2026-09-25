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

// Keep React's real effects/unmount lifecycle. Native animation and scrolling
// are boundaries here; recognition and finger tracking still need an iPhone.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const collapse = mock();
const expand = mock();
const scrollTo = mock();
let reducedMotion = false;

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
mock.module('../src/components/DataFeedback', () => ({
  DataFeedback: 'DataFeedback',
}));
mock.module('../src/data/AppDataProvider', () => ({
  useAppData: () => ({ data: defaultAppData(), status: 'ready', busy: false }),
}));
mock.module('../src/motion/ReducedMotion', () => ({
  useReducedMotion: () => reducedMotion,
}));
mock.module('../src/places/PlaceSelectionCard', () => ({
  PlaceSelectionContent: 'PlaceSelection',
}));
mock.module('../src/countries/CountryDetailsContent', () => ({
  CountryDetailsContent: 'CountryDetails',
}));

const { CountryMapSheet } = await import('../src/countries/CountryMapSheet');
type Props = ComponentProps<typeof CountryMapSheet>;
let root: Root;
let props: Props;

beforeEach(() => {
  collapse.mockClear();
  expand.mockClear();
  scrollTo.mockClear();
  reducedMotion = false;
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

function element(type: string) {
  const matches = root.container.queryAll((node) => node.type === type);
  expect(matches).toHaveLength(1);
  return matches[0];
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
    await settle(1);
    expect(element('PlaceSelection').props.expanded).toBe(true);
    expect(element('CountryDetails').parent?.props.accessibilityElementsHidden)
      .toBe(false);
    scrollTo.mockClear();

    // A fast native transition can settle before onAnimate reaches JS.
    await settle(0);
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
    expect(element('PlaceSelection').props.expanded).toBe(false);
    expect(element('CountryDetails').parent?.props.accessibilityElementsHidden)
      .toBe(true);
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
