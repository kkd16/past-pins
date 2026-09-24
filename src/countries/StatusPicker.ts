import { ActionSheetIOS } from 'react-native';

import type { PlaceStatus } from '../data/model';
import { theme } from '../theme';
import { statusOptions } from './status';

export function showStatusPicker(
  title: string,
  onSelect: (status: PlaceStatus) => void,
) {
  ActionSheetIOS.showActionSheetWithOptions(
    {
      title,
      options: [...statusOptions.map(({ label }) => label), 'Cancel'],
      cancelButtonIndex: statusOptions.length,
      userInterfaceStyle: theme.appearance.colorScheme,
    },
    (index) => {
      if (index < statusOptions.length) onSelect(statusOptions[index].value);
    },
  );
}
