import { expect, test } from 'bun:test';

import { decodeDocument, encodeDocument } from '../../src/data/document';
import fixture from './demo-document.json';

test('fictional screenshot data loads with the released document decoder', () => {
  const data = decodeDocument(JSON.stringify(fixture));
  expect<unknown>(decodeDocument(encodeDocument(data))).toEqual(fixture.data);
  expect(data.onboardingCompleted).toBe(true);
  expect(data.preferences.countryArrivalAlerts).toBe(false);
  expect(data.homePlaceId).toBe('city:2759794');
});
