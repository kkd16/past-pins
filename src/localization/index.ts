import { getLocales } from 'expo-localization';

import { createLocalization } from './core';
import atlas from './locales/en/atlas.json';
import common from './locales/en/common.json';
import countries from './locales/en/countries.json';
import settings from './locales/en/settings.json';
import location from './locales/en/location.json';

export const translations = {
  en: { common, countries, atlas, settings, location },
};
export const {
  t,
  language,
  formatNumber,
  formatPercent,
  formatList,
  compareNames,
} = createLocalization(
  translations,
  getLocales()[0].languageTag,
  new Intl.NumberFormat().resolvedOptions().locale,
);
