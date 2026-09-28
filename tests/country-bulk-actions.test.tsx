import { defaultAppData } from '../src/data/model';
import type { DataSnapshot } from '../src/data/store';
import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'test-renderer';

import type { PlaceStatus } from '../src/data/model';
import { t } from '../src/localization';
import { navigation } from './setup';
import './native-location';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let chooseStatus: (status: PlaceStatus) => void;
const { appData } = await import('../src/data/app-data');
let setStatus: ReturnType<typeof spyOn<typeof appData, 'setStatus'>>;

mock.module('../src/components/AppText', () => ({ AppText: 'Text' }));
mock.module('../src/components/Button', () => ({ Button: 'Button' }));
mock.module('../src/components/Surface', () => ({ Surface: 'Surface' }));
mock.module('../src/data/AppData', () => ({
  useAppData: <T,>(select: (snapshot: DataSnapshot) => T) => select({
    data: defaultAppData(), status: 'ready', busy: false,
    saveError: false, resetVersion: 0,
  }),
}));
mock.module('../src/countries/StatusPicker', () => ({
  showStatusPicker: (_title: string, onSelect: typeof chooseStatus) => {
    chooseStatus = onSelect;
  },
}));

const { CountryBulkActions } = await import('../src/countries/CountryBulkActions');
type Props = ComponentProps<typeof CountryBulkActions>;
let root: Root;
let props: Props;

beforeEach(() => {
  navigation.focused = true;
  setStatus = spyOn(appData, 'setStatus').mockResolvedValue(true);
  root = createRoot({ isStrictMode: true });
  props = {
    resultIds: ['ca', 'fr'],
    selectedIds: new Set(['ca']),
    onSelectionChange: mock(),
    onEndSelection: mock(),
  };
});

afterEach(async () => {
  await act(async () => root.unmount());
  setStatus.mockRestore();
  navigation.focused = true;
});

async function render(changes: Partial<Props> = {}) {
  props = { ...props, ...changes };
  await act(async () => root.render(<CountryBulkActions {...props} />));
}

async function openStatusPicker() {
  const buttons = root.container.queryAll((node) =>
    node.type === 'Button' &&
    node.props.label === t('countries.updateCount', {
      count: props.selectedIds.size,
      amount: String(props.selectedIds.size),
    }),
  );
  expect(buttons).toHaveLength(1);
  await act(async () => buttons[0].props.onPress());
}

test('bulk status closes selection only after the update is applied', async () => {
  const saving = Promise.withResolvers<boolean>();
  setStatus.mockReturnValue(saving.promise);
  await render();
  await openStatusPicker();
  await act(async () => chooseStatus('visited'));
  expect(setStatus).toHaveBeenCalledWith(['ca'], 'visited', { isCurrent: expect.any(Function) });
  expect(props.onEndSelection).not.toHaveBeenCalled();

  await act(async () => saving.resolve(true));
  expect(props.onEndSelection).toHaveBeenCalledTimes(1);
});

test('an unapplied bulk update preserves the selection', async () => {
  setStatus.mockResolvedValue(false);
  await render();
  await openStatusPicker();
  await act(async () => chooseStatus('visited'));
  expect(props.onEndSelection).not.toHaveBeenCalled();
});

test.each(['selection change', 'screen blur', 'unmount'])(
  'a delayed status picker cannot update old countries after %s',
  async (transition) => {
    await render();
    await openStatusPicker();
    if (transition === 'selection change')
      await render({ selectedIds: new Set(['fr']) });
    else if (transition === 'screen blur') {
      navigation.focused = false;
      await render();
    } else await act(async () => root.unmount());

    await act(async () => chooseStatus('visited'));
    expect(setStatus).not.toHaveBeenCalled();
    expect(props.onEndSelection).not.toHaveBeenCalled();
  },
);

test('finishing an old update does not dismiss a newer selection', async () => {
  const saving = Promise.withResolvers<boolean>();
  setStatus.mockReturnValue(saving.promise);
  await render();
  await openStatusPicker();
  await act(async () => chooseStatus('visited'));
  await render({ selectedIds: new Set(['fr']) });
  await act(async () => saving.resolve(true));
  expect(props.onEndSelection).not.toHaveBeenCalled();
});
