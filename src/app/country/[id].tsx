import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';

import { CountryDetailsContent } from '../../countries/CountryDetailsContent';

export default function CountryDetailsRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
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
