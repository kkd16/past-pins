import { requireNativeModule } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import { DataError } from '../../../src/data/data-error';

export function assertStartupResetComplete() {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
  try {
    const recovery = requireNativeModule<{
      getStartupResetStatus(): 'none' | 'completed' | 'failed';
    }>('PastPinsRecovery');
    if (recovery.getStartupResetStatus() === 'failed') throw new DataError('reset-failed');
  } catch (error) {
    throw new DataError('reset-failed', undefined, { cause: error });
  }
}
