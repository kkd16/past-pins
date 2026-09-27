import { DOMParser, onErrorStopParsing } from '@xmldom/xmldom';

export function parseCurrencyFunds(xml: string) {
  const document = new DOMParser({ onError: onErrorStopParsing })
    .parseFromString(xml, 'application/xml');
  const root = document.documentElement;
  const published = root?.getAttribute('Pblshd');
  if (root?.tagName !== 'ISO_4217' || !published)
    throw new Error('Expected a dated ISO 4217 currency list.');

  const codes = Array.from(root.getElementsByTagName('CcyNtry'))
    .filter((entry) => entry.getElementsByTagName('CcyNm')[0]?.getAttribute('IsFund') === 'true')
    .map((entry) => entry.getElementsByTagName('Ccy')[0]?.textContent?.trim() ?? '');
  if (!codes.length || codes.some((code) => !/^[A-Z]{3}$/.test(code)))
    throw new Error('Expected valid ISO fund codes.');
  return { published, codes: [...new Set(codes)].sort() };
}
