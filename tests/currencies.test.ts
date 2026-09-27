import { describe, expect, test } from 'bun:test';
import { countries as upstream } from 'countries-list';

import { parseCurrencyFunds } from '../scripts/currency-data';
import { countries, countryById } from '../src/countries/catalog';
import funds from '../src/countries/fund-codes.json';

const source = (entries: string) =>
  `<ISO_4217 Pblshd="2026-09-17"><CcyTbl>${entries}</CcyTbl></ISO_4217>`;
const currency = '<CcyNtry><CcyNm>US Dollar</CcyNm><Ccy>USD</Ccy></CcyNtry>';
const fund = '<CcyNtry><CcyNm IsFund="true">US Dollar (Next day)</CcyNm><Ccy>USN</Ccy></CcyNtry>';

describe('ISO currency funds', () => {
  test('classifies by the source flag, deduplicates, and sorts future codes', () => {
    expect(parseCurrencyFunds(source(`${fund}${currency}${fund}
      <CcyNtry><Ccy>ABC</Ccy><CcyNm IsFund='true'>Future fund</CcyNm></CcyNtry>
      <CcyNtry><CcyNm IsFund="false">Currency</CcyNm><Ccy>DEF</Ccy></CcyNtry>
      <CcyNtry><CcyNm>No universal currency</CcyNm></CcyNtry>
    `))).toEqual({ published: '2026-09-17', codes: ['ABC', 'USN'] });
  });

  test.each([
    '<html>Download unavailable</html>',
    '<ISO_4217><CcyTbl/></ISO_4217>',
    source(''),
    source(currency),
    source(fund),
    source(`${currency}${fund}`).replace('2026-09-17', '2026-99-99'),
    source(`${currency}${fund}`).replace('2026-09-17', '2026-02-30'),
    source(`${currency}${fund}`).replace('<Ccy>USD</Ccy>', '<Ccy> </Ccy>'),
    source(`${currency}${fund}`).replace('</CcyTbl>', ''),
    source(`${currency}${fund.replace('IsFund="true"', 'IsFund="unknown"')}`),
    source(`${currency}${fund.replace('<Ccy>USN</Ccy>', '')}`),
    source(`${currency}${fund.replace('USN', 'USD')}`),
  ])('rejects invalid or incomplete source %#', (xml) => {
    expect(() => parseCurrencyFunds(xml)).toThrow();
  });

  test('the bundled codes reproduce the committed source snapshot', async () => {
    const xml = await Bun.file(new URL('../scripts/data/currencies.xml', import.meta.url)).text();
    expect(parseCurrencyFunds(xml)).toEqual(funds);
  });
});

describe('displayed country currencies', () => {
  test.each([
    ['us', ['USD']],
    ['ch', ['CHF']],
    ['bo', ['BOB']],
    ['cl', ['CLP']],
    ['uy', ['UYU']],
    ['pa', ['PAB', 'USD']],
    ['bt', ['BTN', 'INR']],
    ['na', ['NAD', 'ZAR']],
  ] as const)('%s excludes funds while retaining real currencies', (id, expected) => {
    expect(countryById.get(id)?.currencies).toEqual([...expected]);
  });

  test('preserves all other currency codes and their order without mutating upstream data', () => {
    const excluded = new Set(funds.codes);
    for (const country of countries) {
      const original = upstream[country.id.toUpperCase() as keyof typeof upstream].currency;
      expect(country.currencies).toEqual(original.filter((code) => !excluded.has(code)));
      if (original.length) expect(country.currencies.length).toBeGreaterThan(0);
    }
    expect(upstream.US.currency).toEqual(['USD', 'USN']);
  });
});
