import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Button } from '../../components/Button';
import { useAppData } from '../../data/AppDataProvider';
import { t } from '../../localization';
import { StampDetailsScreen } from '../../screens/StampDetailsScreen';
import { worldMapHref } from '../../places/navigation';

export default function StampDetailsRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { resetVersion } = useAppData();
  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Button
              label={t('common.done')}
              variant="quiet"
              onPress={() => router.back()}
            />
          ),
        }}
      />
      <StampDetailsScreen
        key={`${id}:${resetVersion}`}
        id={id}
        onBrowse={() => router.dismissTo('/stamps')}
        onShare={() => router.push({ pathname: '/share', params: { kind: 'stamp', id } })}
        onShowMap={(focus) => router.dismissTo(worldMapHref(focus))}
      />
    </>
  );
}
