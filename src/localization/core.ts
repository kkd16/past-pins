import { I18n, type TranslateOptions } from 'i18n-js';

type MessageKey<T> = {
  [K in keyof T & string]: T[K] extends string | { one: string; other: string }
    ? K
    : T[K] extends object
      ? `${K}.${MessageKey<T[K]>}`
      : never;
}[keyof T & string];

export function createLocalization<const Messages extends object>(
  translations: { en: Messages } & Record<string, object>,
  preferredLocale: string,
  locale = preferredLocale,
) {
  const i18n = new I18n(translations, {
    locale: preferredLocale,
    enableFallback: true,
  });
  const language =
    i18n.locales
      .get(preferredLocale)
      .find((candidate) => candidate in translations) ?? i18n.defaultLocale;
  i18n.locale = language;
  const numberFormatter = new Intl.NumberFormat(locale);
  const percentFormatter = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  });
  const collator = new Intl.Collator(language);

  return {
    language,
    t(key: MessageKey<Messages>, values?: TranslateOptions) {
      return i18n.t(key, values);
    },
    formatNumber: numberFormatter.format,
    formatPercent: percentFormatter.format,
    compareNames: collator.compare,
    formatList(values: readonly string[]) {
      return i18n.toSentence([...values]);
    },
  };
}
