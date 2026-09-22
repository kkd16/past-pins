import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { theme } from '../theme';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

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
        accessibilityLabel="Search"
        placeholder="Search"
        placeholderTextColor={theme.color.textMuted}
        selectionColor={theme.color.accent}
        keyboardAppearance="dark"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        {...props}
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, style]}
      />
      {value.length > 0 && (
        <IconButton
          name="close"
          size={18}
          accessibilityLabel="Clear search"
          onPress={() => onChangeText('')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: theme.space.lg,
    paddingRight: theme.space.xs,
    backgroundColor: theme.color.surface,
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
