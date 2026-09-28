import { ActionSheetIOS, Keyboard, StyleSheet } from 'react-native';

import { t } from '../localization';
import { useActionGuard } from '../navigation/useActionGuard';
import { theme } from '../theme';
import { AppPressable } from './AppPressable';
import { AppText } from './AppText';
import { Icon } from './Icon';

export function ChoiceMenu<T extends string>({ value, options, title, onChange, disabled = false }: {
  value: T;
  options: readonly { value: T; label: string }[];
  title: string;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const guard = useActionGuard(value);
  const label = options.find((option) => option.value === value)?.label;
  return (
    <AppPressable
      disabled={disabled}
      accessibilityLabel={title}
      accessibilityValue={{ text: label }}
      style={styles.control}
      onPress={() => {
        Keyboard.dismiss();
        const isCurrent = guard();
        ActionSheetIOS.showActionSheetWithOptions({
          title,
          options: [...options.map(({ label }) => label), t('common.cancel')],
          cancelButtonIndex: options.length,
          userInterfaceStyle: theme.appearance.colorScheme,
        }, (index) => {
          if (isCurrent() && options[index]) onChange(options[index].value);
        });
      }}
    >
      <AppText variant="label" style={styles.label}>{label}</AppText>
      <Icon name="chevronDown" size={theme.size.iconSmall} />
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  control: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, padding: theme.space.md, borderRadius: theme.radius.sm, backgroundColor: theme.color.surface },
  label: { flexShrink: 1 },
});
