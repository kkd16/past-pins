import { router } from 'expo-router';

import { WelcomeScreen } from '../../screens/WelcomeScreen';

export default function WelcomeRoute() {
  return <WelcomeScreen onContinue={() => router.navigate('/onboarding/reminders')} />;
}
