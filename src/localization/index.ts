import { getLocales } from 'expo-localization';

import { createLocalization } from './core';
import atlas from './locales/en/atlas.json';
import common from './locales/en/common.json';
import countries from './locales/en/countries.json';
import settings from './locales/en/settings.json';
import location from './locales/en/location.json';
import subdivisions from './locales/en/subdivisions.json';
import subdivisionKinds from './locales/en/subdivisionKinds.json';
import lists from './locales/en/lists.json';
import stamps from './locales/en/stamps.json';
import places from './locales/en/places.json';
import sharing from './locales/en/sharing.json';
import onboarding from './locales/en/onboarding.json';
import recovery from './locales/en/recovery.json';

export const translations = {
  en: {
    common,
    countries,
    atlas,
    settings,
    location,
    subdivisions,
    subdivisionKinds,
    lists,
    stamps,
    places,
    sharing,
    onboarding,
    recovery,
  },
};
export const {
  t,
  language,
  formatDate,
  formatNumber,
  formatPercent,
  formatList,
  compareNames,
} = createLocalization(
  translations,
  getLocales()[0].languageTag,
  new Intl.NumberFormat().resolvedOptions().locale,
);
