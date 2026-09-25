import { router, useLocalSearchParams } from 'expo-router';

import { StampDetailsScreen } from '../../screens/StampDetailsScreen';

export default function StampDetailsRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  return (
    <StampDetailsScreen
      id={id}
      onClose={() => router.back()}
      onShare={() =>
        router.push({ pathname: '/share', params: { kind: 'stamp', id } })
      }
    />
  );
}
