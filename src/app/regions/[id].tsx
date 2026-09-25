import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Button } from '../../components/Button';
import { countryById } from '../../countries/catalog';
import { readCountryScope } from '../../countries/filters';
import { useAppData } from '../../data/AppDataProvider';
import { t } from '../../localization';
import { placesHref } from '../../places/navigation';
import { SubdivisionsScreen } from '../../screens/SubdivisionsScreen';

export default function SubdivisionsRoute() {
  const params = useLocalSearchParams<{
    id: string;
    focus?: string;
    scope?: string;
  }>();
  const { resetVersion } = useAppData();
  const id = typeof params.id === 'string' ? params.id : '';
  const focus = typeof params.focus === 'string' ? params.focus : undefined;
  const scope = readCountryScope(params.scope);
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
        key={`${id}:${focus ?? ''}:${scope}:${resetVersion}`}
        countryId={id}
        initialSelectedId={focus}
        initialScope={scope}
        onOpenCountry={() =>
          router.dismissTo({ pathname: '/country/[id]', params: { id } })
        }
        onSaveToLists={(placeId) =>
          router.push({ pathname: '/lists/add', params: { placeId } })
        }
        onBrowse={() => router.dismissTo(placesHref('regions'))}
      />
    </>
  );
}
