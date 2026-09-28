import type { DataSnapshot } from '../src/data/store';
import { afterEach, beforeEach, expect, mock, test } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'test-renderer';

import { defaultAppData } from '../src/data/model';
import { t } from '../src/localization';
import { native } from './setup';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let data = defaultAppData();
let status: 'ready' | 'loading' | 'load-error' = 'ready';
let busy = false;

mock.module('../src/data/AppData', () => ({
  useAppData: <T,>(select: (snapshot: DataSnapshot) => T) => select({
    data, status, busy, saveError: false, resetVersion: 0,
  }),
}));
mock.module('../src/components/AppPressable', () => ({ AppPressable: 'Pressable' }));
mock.module('../src/components/AppText', () => ({ AppText: 'Text' }));
mock.module('../src/components/Button', () => ({ Button: 'Button' }));
mock.module('../src/components/DataFeedback', () => ({ DataFeedback: 'DataFeedback' }));
mock.module('../src/components/Icon', () => ({ Icon: 'Icon' }));
mock.module('../src/components/Screen', () => ({ Screen: 'Screen' }));
mock.module('../src/components/SheetHeader', () => ({ SheetHeader: 'SheetHeader' }));
mock.module('../src/components/SearchField', () => ({ SearchField: 'SearchField' }));
mock.module('../src/support/ReportErrorButton', () => ({ ReportErrorButton: 'ReportErrorButton' }));

const { PlaceSearchScreen } = await import('../src/screens/PlaceSearchScreen');
const onSelect = mock();
const onCancel = mock();
const onClear = mock();
let root: Root;

beforeEach(() => {
  data = defaultAppData();
  status = 'ready';
  busy = false;
  onSelect.mockClear();
  onCancel.mockClear();
  onClear.mockClear();
  native.Keyboard.dismiss.mockClear();
  root = createRoot({ isStrictMode: true });
});

afterEach(async () => {
  await act(async () => root.unmount());
});

async function render() {
  await act(async () => {
    root.render(
      <PlaceSearchScreen
        title={t('places.searchTitle')}
        countriesOnly
        onSelect={onSelect}
        onCancel={onCancel}
        onClear={onClear}
      />,
    );
  });
}

function element(type: string, label?: string) {
  const matches = root.container.queryAll((node) =>
    node.type === type && (label === undefined || node.props.label === label),
  );
  expect(matches).toHaveLength(1);
  return matches[0];
}

test.each(['loading', 'load-error'] as const)(
  'search hides unknown travel statuses during %s and preserves the query after recovery',
  async (unavailableStatus) => {
    status = unavailableStatus;
    await render();
    await act(async () => element('SearchField').props.onChangeText('Canada'));

    expect(element('FlatList').props.data).toEqual([]);
    expect(element('FlatList').props.ListEmptyComponent).toBeNull();
    expect(element('DataFeedback')).toBeDefined();
    expect(element('Button', t('countries.details.clearHome')).props.disabled).toBe(true);
    await act(async () => element('SheetHeader').props.onDismiss());
    expect(native.Keyboard.dismiss).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();

    data = { ...defaultAppData(), places: { ca: 'visited' } };
    status = 'ready';
    await render();
    expect(element('SearchField').props.value).toBe('Canada');
    const list = element('FlatList');
    expect(list.props.data.map(({ id }: { id: string }) => id)).toEqual(['ca']);
    const result = list.props.renderItem({ item: list.props.data[0] });
    await act(async () => root.render(result));
    const row = element('Pressable');
    expect(row.props.disabled).toBe(false);
    expect(row.props.accessibilityLabel).toBe(
      t('countries.countryStatus', { name: 'Canada', status: t('countries.status.visited') }),
    );
    await act(async () => row.props.onPress());
    expect(onSelect).toHaveBeenCalledWith('ca');
  },
);

test('a busy search keeps loaded travel statuses visible and prevents selection', async () => {
  data = { ...defaultAppData(), places: { ca: 'visited' } };
  busy = true;
  await render();
  await act(async () => element('SearchField').props.onChangeText('Canada'));
  const list = element('FlatList');
  expect(list.props.data).toHaveLength(1);
  expect(list.props.renderItem({ item: list.props.data[0] }).props.disabled).toBe(true);
  expect(element('Button', t('countries.details.clearHome')).props.disabled).toBe(true);
});
