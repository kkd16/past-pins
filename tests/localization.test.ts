import { describe, expect, test } from 'bun:test';

import appConfig from '../app.json';
import { translations as appTranslations } from '../src/localization';
import { createLocalization } from '../src/localization/core';

const translations = {
  en: {
    greeting: 'Hello, %{name}.',
    count: { one: '%{amount} place', other: '%{amount} places' },
    fallback: 'English fallback',
  },
  fr: { greeting: 'Bonjour, %{name}.' },
} as const;

describe('localization', () => {
  test('declares only bundled translations in iOS language settings', () => {
    const plugin = appConfig.expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-localization',
    ) as [string, { supportedLocales: { ios: string[] } }];
    expect(plugin[1].supportedLocales.ios).toEqual(
      Object.keys(appTranslations),
    );
  });

  test('uses library fallbacks for regional and unsupported languages', () => {
    expect(createLocalization(translations, 'fr-CA').language).toBe('fr');
    expect(createLocalization(translations, 'ja-JP').language).toBe('en');
    expect(createLocalization(translations, 'en-CA').language).toBe('en');
  });

  test('interpolates whole messages and falls back to English', () => {
    const { t, language } = createLocalization(translations, 'fr-CA');
    expect(t('greeting', { name: 'Kyle' })).toBe('Bonjour, Kyle.');
    expect(t('fallback')).toBe('English fallback');
    expect(language).toBe('fr');
  });

  test('uses plural messages and localized values independently', () => {
    const { t, formatNumber } = createLocalization(translations, 'en-CA');
    for (const count of [0, 1, 2, 1200]) {
      expect(t('count', { count, amount: formatNumber(count) })).toBe(
        `${formatNumber(count)} ${count === 1 ? 'place' : 'places'}`,
      );
    }
  });

  test('keeps regional number formatting when the UI language falls back', () => {
    const { formatNumber, formatPercent, language } = createLocalization(
      { en: translations.en },
      'de-DE',
    );
    expect(language).toBe('en');
    expect(formatNumber(1234.5)).toBe('1.234,5');
    expect(formatPercent(0.25)).toBe(
      new Intl.NumberFormat('de-DE', {
        style: 'percent',
        maximumFractionDigits: 1,
      }).format(0.25),
    );
  });

  test('keeps a first visit visible in the formatted percentage', () => {
    const { formatPercent } = createLocalization(translations, 'en');
    expect(formatPercent(1 / 253)).toBe('0.4%');
    expect(formatPercent(1)).toBe('100%');
  });

  test('honors a separate device region while retaining the app language', () => {
    const { t, formatNumber, language } = createLocalization(
      translations,
      'en-CA',
      'de-DE',
    );
    expect(t('greeting', { name: 'Kyle' })).toBe('Hello, Kyle.');
    expect(language).toBe('en');
    expect(formatNumber(1234.5)).toBe('1.234,5');
  });

  test('formats country facts with the library sentence formatter', () => {
    const { formatList } = createLocalization(translations, 'en');
    expect(formatList([])).toBe('');
    expect(formatList(['English'])).toBe('English');
    expect(formatList(['English', 'French'])).toBe('English and French');
    expect(formatList(['English', 'French', 'German'])).toBe(
      'English, French, and German',
    );
  });
});
