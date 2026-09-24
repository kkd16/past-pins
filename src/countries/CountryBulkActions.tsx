import { Keyboard, ScrollView, StyleSheet } from 'react-native';

import { Button } from '../components/Button';
import { Surface } from '../components/Surface';
import { useAppData } from '../data/AppDataProvider';
import { formatNumber, t } from '../localization';
import { theme } from '../theme';
import { showStatusPicker } from './StatusPicker';
import type { CountryId } from './types';

export function CountryBulkActions({
  resultIds,
  selectedIds,
  onSelectionChange,
  onComplete,
}: {
  resultIds: readonly CountryId[];
  selectedIds: ReadonlySet<CountryId>;
  onSelectionChange: (ids: ReadonlySet<CountryId>) => void;
  onComplete: () => void;
}) {
  const { status, busy, setStatus } = useAppData();
  const disabled = status !== 'ready' || busy;
  const allSelected = selectedIds.size === resultIds.length;
  const count = {
    count: selectedIds.size,
    amount: formatNumber(selectedIds.size),
  };

  return (
    <ScrollView
      style={styles.scroll}
      bounces={false}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
    >
      <Surface style={styles.actions}>
        <Button
          label={
            allSelected
              ? t('countries.deselectAll')
              : t('countries.selectAll')
          }
          variant="quiet"
          disabled={disabled}
          onPress={() => {
            Keyboard.dismiss();
            onSelectionChange(new Set(allSelected ? [] : resultIds));
          }}
        />
        <Button
          label={t('countries.updateCount', count)}
          disabled={disabled || selectedIds.size === 0}
          onPress={() => {
            Keyboard.dismiss();
            showStatusPicker(t('countries.placeCount', count), (nextStatus) => {
              void setStatus([...selectedIds], nextStatus).then((applied) => {
                if (applied) onComplete();
              });
            });
          }}
        />
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, maxHeight: '40%', marginVertical: theme.space.sm },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    padding: theme.space.sm,
  },
});
