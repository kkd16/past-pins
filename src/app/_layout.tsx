import { lazy, Suspense } from 'react';
import { ActivityIndicator } from 'react-native';
import { t } from '../localization';

export { RecoveryBoundary as ErrorBoundary } from '../recovery/RecoveryBoundary';

const AppShell = lazy(() => import('../navigation/AppShell'));
export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  return <Suspense fallback={<ActivityIndicator accessibilityLabel={t('countries.loadingPlaces')} />}><AppShell /></Suspense>;
}
