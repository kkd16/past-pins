import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Button } from '../../components/Button';
import { useAppData } from '../../data/AppDataProvider';
import { t } from '../../localization';
import { StampDetailsScreen } from '../../screens/StampDetailsScreen';

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
        onShowMap={(focus) =>
          router.dismissTo({
            pathname: '/',
            params: { focus, focusRequest: String(Date.now()) },
          })
        }
      />
    </>
  );
}
