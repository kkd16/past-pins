import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Button } from '../../components/Button';
import { countryById } from '../../countries/catalog';
import { t } from '../../localization';
import { SubdivisionsScreen } from '../../screens/SubdivisionsScreen';

export default function SubdivisionsRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  return (
    <>
      <Stack.Screen
        options={{
          title: countryById.get(id)?.name ?? t('subdivisions.title'),
          headerRight: () => (
            <Button
              label={t('common.done')}
              variant="quiet"
              onPress={() => router.back()}
            />
          ),
        }}
      />
      <SubdivisionsScreen
        key={id}
        countryId={id}
        onBrowse={() => router.replace('/regions')}
      />
    </>
  );
}
