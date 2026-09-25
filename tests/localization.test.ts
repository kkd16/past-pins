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
    expect([...plugin[1].supportedLocales.ios].sort()).toEqual(
      Object.keys(appTranslations).sort(),
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
    for (const [count, message] of [
      [0, '0 places'],
      [1, '1 place'],
      [2, '2 places'],
      [1200, '1,200 places'],
    ] as const) {
      expect(t('count', { count, amount: formatNumber(count) })).toBe(message);
    }
  });

  test('keeps regional number formatting when the UI language falls back', () => {
    const { formatNumber, formatPercent, language } = createLocalization(
      { en: translations.en },
      'de-DE',
    );
    expect(language).toBe('en');
    expect(formatNumber(1234.5)).toBe('1.234,5');
    expect(formatPercent(0.25)).toBe('25\u00a0%');
  });

  test('keeps a first visit visible in the formatted percentage', () => {
    const { formatPercent } = createLocalization(translations, 'en');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(1 / 253)).toBe('0.4%');
    expect(formatPercent(1 / 4543)).toBe('0.02%');
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

  test('sorts names in the app language even when the device region sorts accents differently', () => {
    const { compareNames } = createLocalization(translations, 'en', 'sv-SE');
    expect(['Zambia', 'Öland', 'Austria'].sort(compareNames)).toEqual([
      'Austria', 'Öland', 'Zambia',
    ]);
  });

  test('formats country facts as readable lists', () => {
    const { formatList } = createLocalization(translations, 'en');
    expect(formatList([])).toBe('');
    expect(formatList(['English'])).toBe('English');
    expect(formatList(['English', 'French'])).toBe('English and French');
    expect(formatList(['English', 'French', 'German'])).toBe(
      'English, French, and German',
    );
  });
});
