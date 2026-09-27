import { describe, expect, test } from 'bun:test';

import { parseCurrencyFunds } from '../scripts/currency-data';
import { countryById } from '../src/countries/catalog';

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
    source(fund.replace('USN', 'invalid')),
    source(`${currency}${fund}`).replace('</CcyTbl>', ''),
    source(`${currency}${fund.replace('IsFund="true"', 'IsFund="unknown"')}`),
    source(`${currency}${fund.replace('<Ccy>USN</Ccy>', '')}`),
  ])('rejects invalid or incomplete source %#', (xml) => {
    expect(() => parseCurrencyFunds(xml)).toThrow();
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
});
