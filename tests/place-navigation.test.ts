import { describe, expect, test } from 'bun:test';
import { resolveHref } from 'expo-router/build/link/href';
import { TabRouter } from 'expo-router/build/react-navigation/routers/TabRouter';

import { getStaticPlace } from '../src/places/catalog';
import { citiesHref, placeHref, placesHref, worldMapHref } from '../src/places/navigation';
import { getCountrySubdivisions } from '../src/subdivisions/catalog';

function createPlacesNavigation() {
  const router = TabRouter({ initialRouteName: 'index' });
  const options = {
    routeNames: ['index', 'countries', 'stats'],
    routeParamList: {},
    routeGetIdList: {},
  };
  let state = router.getInitialState(options);
  return (href: Parameters<typeof resolveHref>[0]) => {
    const url = new URL(resolveHref(href), 'https://pastpins.test');
    const next = router.getStateForAction(state, {
      type: 'NAVIGATE',
      payload: {
        name: url.pathname.slice(1),
        params: Object.fromEntries(url.searchParams),
      },
    }, options);
    if (next?.stale !== false) throw new Error('Navigation did not produce a complete state.');
    state = next;
    return state.routes[state.index].params;
  };
}

describe('shared place navigation', () => {
  test('country links open details and region links retain their parent and scope', () => {
    expect(placeHref(getStaticPlace('ca')!)).toEqual({
      pathname: '/country/[id]',
      params: { id: 'ca' },
    });
    const region = getStaticPlace(getCountrySubdivisions('ca')[0].id)!;
    expect(placeHref(region, 'visited')).toEqual({
      pathname: '/regions/[id]',
      params: { id: 'ca', focus: region.id, scope: 'visited' },
    });
  });

  test('repeated map destinations remain separate focus requests', () => {
    const first = worldMapHref('ca');
    const second = worldMapHref('ca');
    expect(first.pathname).toBe('/');
    expect(second.params.focus).toBe(first.params.focus);
    expect(second.params.focusRequest).not.toBe(first.params.focusRequest);
  });

  test('opening Places clears a previous search and gives each visit a fresh intent', () => {
    const first = placesHref('regions', 'visited', 'NA');
    const second = placesHref('regions', 'visited', 'NA');
    expect(first.params).toMatchObject({
      mode: 'regions',
      scope: 'visited',
      location: 'continent:NA',
      query: '',
    });
    expect(second.params.intent).not.toBe(first.params.intent);
    expect(placesHref('countries').params).toMatchObject({
      mode: 'countries',
      scope: 'all',
      location: 'anywhere',
      query: '',
    });
  });

  test.each(['countries', 'regions', 'cities'] as const)(
    'opening global %s from statistics clears previous city hierarchy filters',
    (mode) => {
      const navigate = createPlacesNavigation();
      const regionId = getCountrySubdivisions('ca')[0].id;
      expect(navigate(citiesHref('ca', regionId))).toMatchObject({
        mode: 'cities', location: regionId,
      });
      navigate('/stats');

      const params = navigate(placesHref(mode, 'visited', 'NA'));
      expect(params).toMatchObject({ mode, scope: 'visited', location: 'continent:NA', query: '' });
    },
  );

  test('opening a country city list clears a previous region and search', () => {
    const navigate = createPlacesNavigation();
    const scoped = citiesHref('ca', getCountrySubdivisions('ca')[0].id);
    navigate({ ...scoped, params: { ...scoped.params, query: 'Toronto', scope: 'visited' } });

    const params = navigate(citiesHref('ca'));
    expect(params).toMatchObject({
      mode: 'cities', location: 'ca', scope: 'all', query: '',
    });
  });
});
