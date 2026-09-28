import { expect, mock } from 'bun:test';
import { act } from 'react';
import { createRoot } from 'test-renderer';

import { native } from '../setup';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const layout = { isRTL: false };
mock.module('react-native', () => ({ ...native, I18nManager: layout }));
mock.module('@react-native-segmented-control/segmented-control', () => ({ default: 'SegmentedControl' }));
mock.module('../../src/components/AppPressable', () => ({ AppPressable: 'Pressable' }));
mock.module('../../src/components/AppText', () => ({ AppText: 'Text' }));
mock.module('../../src/components/Icon', () => ({ Icon: 'Icon' }));

const { ChoiceControl } = await import('../../src/components/ChoiceControl');
const { t } = await import('../../src/localization');
const root = createRoot({ isStrictMode: true });
const onChange = mock();
const options = [
  { value: 'countries', label: t('places.countries') },
  { value: 'regions', label: t('places.regions') },
  { value: 'cities', label: t('places.cities') },
] as const;

async function render(disabled = false) {
  await act(async () => root.render(
    <ChoiceControl value="cities" options={options} onChange={onChange}
      disabled={disabled} accessibilityLabel={t('places.modeLabel')} />,
  ));
}

await render();
const segment = root.container.queryAll((node) => node.type === 'SegmentedControl')[0];
expect(segment.props.selectedIndex).toBe(2);
expect(segment.props.values).toEqual(options.map(({ label }) => label));
expect(segment.props.accessibilityLabel).toBe(t('places.modeLabel'));
expect(segment.props.enabled).toBe(true);
await act(async () => segment.props.onChange({ nativeEvent: { selectedSegmentIndex: 1 } }));
expect(onChange).toHaveBeenLastCalledWith('regions');
await render(true);
expect(root.container.queryAll((node) => node.type === 'SegmentedControl')[0].props.enabled).toBe(false);

for (const rtl of [false, true]) {
  layout.isRTL = rtl;
  native.useWindowDimensions.mockReturnValue({ width: 375, height: 812, scale: 3, fontScale: rtl ? 1 : 2 });
  await render();
  expect(root.container.queryAll((node) => node.type === 'SegmentedControl')).toHaveLength(0);
  const group = root.container.queryAll((node) => node.props.accessibilityRole === 'radiogroup')[0];
  expect(group.props.accessibilityLabel).toBe(t('places.modeLabel'));
  const rows = root.container.queryAll((node) => node.type === 'Pressable');
  expect(rows).toHaveLength(3);
  expect(rows.map(({ props }) => props.accessibilityState.checked)).toEqual([false, false, true]);
  expect(rows.every(({ props }) => props.accessibilityRole === 'radio')).toBe(true);
  await act(async () => rows[0].props.onPress());
  expect(onChange).toHaveBeenLastCalledWith('countries');
  await render(true);
  expect(root.container.queryAll((node) => node.type === 'Pressable').every(({ props }) => props.disabled)).toBe(true);
}

await act(async () => root.unmount());
process.stdout.write('passed');
