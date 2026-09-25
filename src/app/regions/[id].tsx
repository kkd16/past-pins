import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Button } from '../../components/Button';
import { countryById } from '../../countries/catalog';
import { t } from '../../localization';
import { SubdivisionsScreen } from '../../screens/SubdivisionsScreen';

export default function SubdivisionsRoute() {
  const params = useLocalSearchParams<{ id: string; focus?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const focus = typeof params.focus === 'string' ? params.focus : undefined;
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
        key={`${id}:${focus ?? ''}`}
        countryId={id}
        initialSelectedId={focus}
        onSaveToLists={(placeId) =>
          router.push({ pathname: '/lists/add', params: { placeId } })
        }
        onBrowse={() => router.replace('/regions')}
      />
    </>
  );
}
