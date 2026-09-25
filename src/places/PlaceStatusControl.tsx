import { StyleSheet, View } from 'react-native';

import { Button } from '../components/Button';
import { statusOptions } from '../countries/status';
import type { PlaceStatus } from '../data/model';
import { t } from '../localization';
import { theme } from '../theme';

export function PlaceStatusControl({
  status,
  disabled = false,
  onChange,
}: {
  status: PlaceStatus;
  disabled?: boolean;
  onChange: (status: PlaceStatus) => void;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('countries.status.title')}
      style={styles.choices}
    >
      {statusOptions.map(({ value, label }) => (
        <Button
          key={value}
          label={label}
          variant={status === value ? 'primary' : 'quiet'}
          accessibilityRole="radio"
          accessibilityState={{ checked: status === value }}
          disabled={disabled}
          onPress={() => onChange(value)}
          style={styles.choice}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.xs },
  choice: { flexGrow: 1, paddingHorizontal: theme.space.sm },
});
