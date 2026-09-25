import { StyleSheet } from 'react-native';

import { theme } from '../theme';
import { AppPressable, type AppPressableProps } from './AppPressable';
import { Icon, type IconProps } from './Icon';

type IconButtonProps = Omit<
  AppPressableProps,
  'children' | 'accessibilityLabel'
> &
  IconProps & { accessibilityLabel: string };

export function IconButton({
  name,
  size,
  color,
  style,
  ...props
}: IconButtonProps) {
  return (
    <AppPressable
      {...props}
      style={[styles.base, style]}
    >
      <Icon name={name} size={size} color={color} />
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
