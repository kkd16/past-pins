import { getLocales } from 'expo-localization';

import { createLocalization } from './core';
import atlas from './locales/en/atlas.json';
import common from './locales/en/common.json';
import countries from './locales/en/countries.json';
import settings from './locales/en/settings.json';
import location from './locales/en/location.json';
import subdivisions from './locales/en/subdivisions.json';
import lists from './locales/en/lists.json';
import stamps from './locales/en/stamps.json';
import places from './locales/en/places.json';
import sharing from './locales/en/sharing.json';

export const translations = {
  en: {
    common,
    countries,
    atlas,
    settings,
    location,
    subdivisions,
    lists,
    stamps,
    places,
    sharing,
  },
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
