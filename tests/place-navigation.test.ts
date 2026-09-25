import { describe, expect, test } from 'bun:test';

import { getPlace } from '../src/places/catalog';
import { placeHref, placesHref, worldMapHref } from '../src/places/navigation';
import { getCountrySubdivisions } from '../src/subdivisions/catalog';

describe('shared place navigation', () => {
  test('country links open details and region links retain their parent and scope', () => {
    expect(placeHref(getPlace('ca')!)).toEqual({
      pathname: '/country/[id]',
      params: { id: 'ca' },
    });
    const region = getPlace(getCountrySubdivisions('ca')[0].id)!;
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
      continent: 'NA',
      query: '',
    });
    expect(second.params.intent).not.toBe(first.params.intent);
    expect(placesHref('countries').params).toMatchObject({
      mode: 'countries',
      scope: 'all',
      continent: 'all',
      query: '',
    });
  });
});
