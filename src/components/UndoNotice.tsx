import { StyleSheet } from 'react-native';

import { useAppData } from '../data/AppDataProvider';
import { theme } from '../theme';
import { t } from '../localization';
import { AppText } from './AppText';
import { Button } from './Button';
import { Surface } from './Surface';

export function UndoNotice() {
  const { undoLabel, undo, busy } = useAppData();
  if (!undoLabel) return null;
  return (
    <Surface style={styles.notice}>
      <AppText variant="caption" style={styles.label}>
        {undoLabel}
      </AppText>
      <Button
        label={t('common.undo')}
        variant="quiet"
        onPress={undo}
        disabled={busy}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    padding: theme.space.sm,
  },
  label: { flex: 1 },
});
