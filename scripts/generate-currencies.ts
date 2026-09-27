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
if (values.refresh && await source.exists()) {
  const previous = parseCurrencyFunds(await source.text());
  if (funds.published < previous.published)
    throw new Error(`Currency source ${funds.published} is older than the saved ${previous.published} snapshot.`);
  const added = funds.codes.filter((code) => !previous.codes.includes(code));
  const removed = previous.codes.filter((code) => !funds.codes.includes(code));
  console.log(`Fund codes added: ${added.join(', ') || 'none'}; removed: ${removed.join(', ') || 'none'}.`);
}
const content = `${JSON.stringify(funds, null, 2)}\n`;
if (values.check) {
  if (!(await output.exists()) || await output.text() !== content)
    throw new Error('Currency funds are stale. Run bun run currencies:generate.');
} else {
  if (values.refresh) await Bun.write(source, xml);
  await Bun.write(output, content);
}
console.log(`Currency funds ${values.check ? 'verified offline' : 'generated'} (${funds.codes.length} codes, source ${funds.published}).`);
