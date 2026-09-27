import { Alert } from 'react-native';

import { t } from '../localization';

export function confirmDestructiveAction(title: string, message: string, action: string, isCurrent: () => boolean) {
  return new Promise<boolean>((resolve) => Alert.alert(title, message, [
    { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
    { text: action, style: 'destructive', onPress: () => resolve(isCurrent()) },
  ]));
}
