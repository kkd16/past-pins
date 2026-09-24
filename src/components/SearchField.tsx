import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { theme } from '../theme';
import { t, language } from '../localization';
import { Icon } from './Icon';

export function SearchField({
  value,
  onChangeText,
  style,
  ...props
}: TextInputProps & {
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.container}>
      <Icon name="search" />
      <TextInput
        accessibilityLanguage={language}
        accessibilityRole="search"
        accessibilityLabel={t('common.search')}
        placeholder={t('common.search')}
        placeholderTextColor={theme.color.textMuted}
        selectionColor={theme.color.accent}
        keyboardAppearance={theme.appearance.colorScheme}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="always"
        returnKeyType="search"
        {...props}
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingStart: theme.space.lg,
    paddingEnd: theme.space.xs,
    backgroundColor: theme.color.surface,
    borderWidth: theme.stroke.subtle,
    borderColor: theme.color.controlBorder,
    borderRadius: theme.radius.sm,
    gap: theme.space.sm,
  },
  input: {
    ...theme.typography.body,
    color: theme.color.text,
    flex: 1,
    minHeight: theme.size.touch + theme.space.xs,
    paddingVertical: theme.space.md,
  },
});
