import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { useAppData } from '../data/AppData';
import { ShareScreen } from '../screens/ShareScreen';
import { parseShareTarget } from '../sharing/content';

export default function ShareRoute() {
  const { kind, id } = useLocalSearchParams<{ kind?: string; id?: string }>();
  const resetVersion = useAppData((snapshot) => snapshot.resetVersion);
  const target = useMemo(() => parseShareTarget(kind, id), [kind, id]);
  return (
    <ShareScreen
      key={`${kind}:${id}:${resetVersion}`}
      target={target}
      onClose={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    />
  );
}
