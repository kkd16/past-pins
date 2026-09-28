import * as Haptics from 'expo-haptics';

import { countryById } from '../countries/catalog';
import { confirmDestructiveAction } from '../feedback/confirmDestructiveAction';
import { formatNumber, t } from '../localization';
import { appStorage } from '../storage/app-storage';
import { diagnostics } from '../recovery/diagnostics-file';
import { createAppDataStore } from './store';

export const appData = createAppDataStore(appStorage, {
  report: (operation, error) => diagnostics.record(operation, error),
  confirmStatusChange: ({ descendants, homeCountryId, status }) =>
    confirmDestructiveAction(
      t(descendants ? 'common.statusChangeTitle' : 'common.clearHomeTitle'),
      [
        descendants ? t(
          status === 'visited' ? 'common.downgradeDescendantVisits' : 'common.clearDescendantVisits',
          { count: descendants, amount: formatNumber(descendants) },
        ) : '',
        homeCountryId ? t('common.clearHomeMessage', {
          country: countryById.get(homeCountryId)?.name ?? t('common.thisPlace'),
        }) : '',
      ].filter(Boolean).join(' '),
      t('common.updatePlace'),
    ),
  feedback: (enabled) => {
    if (enabled) void Haptics.selectionAsync().catch(() => undefined);
  },
});
