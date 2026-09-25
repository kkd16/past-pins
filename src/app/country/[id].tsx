import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';

import { CountryDetailsContent } from '../../countries/CountryDetailsContent';
import { useArrivalConfirmation } from '../../location/useArrivalConfirmation';

export default function CountryDetailsRoute() {
  const params = useLocalSearchParams<{ id: string; arrival?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  useArrivalConfirmation(id, typeof params.arrival === 'string' ? params.arrival : undefined);
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior="automatic"
      onAccessibilityEscape={router.back}
    >
      <CountryDetailsContent id={id} />
    </ScrollView>
  );
}
