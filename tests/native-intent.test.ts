import { expect, test } from 'bun:test';

import { redirectSystemPath } from '../src/navigation/native-intent';

test.each([true, false])('native links preserve valid routes when initial is %s', (initial) => {
  for (const path of [
    '/', 'past-pins://', 'past-pins://countries/ca', '/cities/city%3A6167865',
    'past-pins://map-search?query=Qu%C3%A9bec&query=New+York',
    'past-pins://map-search?query=50%25&50%25=value',
    `exp+past-pins://expo-development-client/?url=${encodeURIComponent('http://127.0.0.1:8081')}`,
  ]) {
    expect(redirectSystemPath({ path, initial })).toBe(path);
  }
});

test.each([true, false])('native links reject malformed and oversized decoder inputs when initial is %s', (initial) => {
  const malformed = '%FF'.repeat(256);
  let nested = `past-pins://map-search?query=${encodeURIComponent('%FF'.repeat(8))}`;
  for (let index = 0; index < 3; index++) {
    nested = `past-pins://expo-development-client/?url=${encodeURIComponent(nested)}`;
  }
  for (const path of [
    `/map-search?query=${malformed}`,
    `past-pins://map-search?query=${encodeURIComponent(malformed)}`,
    `past-pins://map-search?query=${encodeURIComponent(encodeURIComponent(malformed))}`,
    'past-pins://countries/%E0%A4',
    `/map-search?${encodeURIComponent(malformed)}=value`,
    `/map-search?query=${'a'.repeat(4096)}`,
    nested,
  ]) {
    expect(redirectSystemPath({ path, initial })).toBe('/');
  }
});
