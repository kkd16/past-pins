import { useEffect, useState } from 'react';
import type { ErrorBoundaryProps } from 'expo-router';

import { diagnostics } from './diagnostics-file';
import { RecoveryScreen, type RecoveryStore } from './RecoveryScreen';

export function RecoveryBoundary({ error, retry }: ErrorBoundaryProps) {
  const [store, setStore] = useState<RecoveryStore | null>();
  useEffect(() => {
    let active = true;
    diagnostics.record('render', error);
    void import('../data/app-data').then(async ({ appData }) => {
      if (!active) return;
      appData.enterRecovery();
      setStore(appData);
      await appData.load();
      if (!active) return;
      void import('../location/arrival-notifications').then(({ syncArrivalMonitoring }) =>
        syncArrivalMonitoring(),
      ).catch((error) => diagnostics.record('reminders', error));
    }).catch((error) => {
      diagnostics.record('load', error);
      if (active) setStore(null);
    });
    return () => { active = false; };
  }, [error]);
  return <RecoveryScreen store={store} error={error} onRetry={async () => {
    store?.leaveRecovery();
    await retry();
  }} />;
}
