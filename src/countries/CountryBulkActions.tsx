import { Keyboard, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
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
  onEndSelection,
}: {
  resultIds: readonly CountryId[];
  selectedIds: ReadonlySet<CountryId>;
  onSelectionChange: (ids: ReadonlySet<CountryId>) => void;
  onEndSelection: () => void;
}) {
  const { status, busy, setStatus } = useAppData();
  const disabled = status !== 'ready' || busy;
  const allSelected = selectedIds.size === resultIds.length;
  const count = {
    count: selectedIds.size,
    amount: formatNumber(selectedIds.size),
  };

  return (
    <Surface style={styles.surface}>
      <View style={styles.header}>
        <AppText variant="label" style={styles.count}>
          {t('countries.selectedCount', count)}
        </AppText>
        <Button
          label={t('common.cancel')}
          variant="quiet"
          onPress={onEndSelection}
        />
      </View>
      <View style={styles.actions}>
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
                if (applied) onEndSelection();
              });
            });
          }}
        />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  surface: { padding: theme.space.sm, gap: theme.space.xs },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.space.md,
  },
  count: { flexGrow: 1, flexBasis: 120, paddingStart: theme.space.md },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
});
