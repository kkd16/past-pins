import { DOMParser, onErrorStopParsing } from '@xmldom/xmldom';

export function parseCurrencyFunds(xml: string) {
  const document = new DOMParser({ onError: onErrorStopParsing })
    .parseFromString(xml, 'application/xml');
  const root = document.documentElement;
  const published = root?.getAttribute('Pblshd');
  const date = new Date(published ?? '');
  if (
    root?.tagName !== 'ISO_4217' ||
    !published ||
    !/^\d{4}-\d{2}-\d{2}$/.test(published) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== published
  )
    throw new Error('Expected a dated ISO 4217 currency list.');

  const classifications = new Map<string, boolean>();
  for (const entry of Array.from(root.getElementsByTagName('CcyNtry'))) {
    const name = entry.getElementsByTagName('CcyNm')[0];
    const codeElement = entry.getElementsByTagName('Ccy')[0];
    const code = codeElement?.textContent?.trim();
    const flag = name?.getAttribute('IsFund');
    if (!name || (flag && flag !== 'true' && flag !== 'false'))
      throw new Error('Invalid currency classification.');
    if (!codeElement && flag !== 'true') continue;
    if (!code || !/^[A-Z]{3}$/.test(code))
      throw new Error('Invalid currency code.');
    const fund = flag === 'true';
    if (classifications.has(code) && classifications.get(code) !== fund)
      throw new Error(`Conflicting classification for ${code}.`);
    classifications.set(code, fund);
  }
  const codes = [...classifications]
    .filter(([, fund]) => fund)
    .map(([code]) => code)
    .sort();
  if (!codes.length || classifications.size === codes.length)
    throw new Error('Expected both currencies and funds.');
  return { published, codes };
}
