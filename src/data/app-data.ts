import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

import { countryById } from '../countries/catalog';
import { t } from '../localization';
import { appStorage } from '../storage/app-storage';
import { diagnostics } from '../recovery/diagnostics-file';
import { createAppDataStore } from './store';

// The UI and background tasks must see the same current travel data.
export const appData = createAppDataStore(appStorage, {
  report: (operation, error) => diagnostics.record(operation, error),
  confirmHomeChange: (id) =>
    new Promise((resolve) => {
      Alert.alert(
        t('common.clearHomeTitle'),
        t('common.clearHomeMessage', {
          country: countryById.get(id)?.name ?? t('common.thisPlace'),
        }),
        [
          { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
          { text: t('common.updatePlace'), onPress: () => resolve(true) },
        ],
      );
    }),
  feedback: (enabled) => {
    if (enabled) void Haptics.selectionAsync().catch(() => undefined);
  },
});
