import { parseArgs } from 'node:util';

import { parseCurrencyFunds } from './currency-data';

const sourceUrl = 'https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-one.xml';
const source = Bun.file(new URL('./data/currencies.xml', import.meta.url));
const output = Bun.file(new URL('../src/countries/fund-codes.json', import.meta.url));
const { values } = parseArgs({
  options: { check: { type: 'boolean' }, refresh: { type: 'boolean' } },
});
if (values.check && values.refresh)
  throw new Error('Choose --check or --refresh.');

let xml: string;
if (values.refresh) {
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Currency download failed: HTTP ${response.status}`);
  xml = await response.text();
} else {
  xml = await source.text();
}
const funds = parseCurrencyFunds(xml);
const content = `${JSON.stringify(funds, null, 2)}\n`;
if (values.check) {
  if (!(await output.exists()) || await output.text() !== content)
    throw new Error('Currency funds are stale. Run bun run currencies:generate.');
} else {
  if (values.refresh) await Bun.write(source, xml);
  await Bun.write(output, content);
}
console.log(`Currency funds ${values.check ? 'verified offline' : 'generated'} (${funds.codes.length} codes, source ${funds.published}).`);
