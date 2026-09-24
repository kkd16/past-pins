import { generateGlobe } from './globe-geometry';

const path = new URL('../src/globe/world.json', import.meta.url);
// Nine significant digits preserve GPU float precision without bundling
// unnecessary double-precision decimal tails.
const generated =
  JSON.stringify(generateGlobe(), (_key, value) =>
    typeof value === 'number' ? Number(value.toPrecision(9)) : value,
  ) + '\n';
if (process.argv.includes('--check')) {
  if ((await Bun.file(path).text()) !== generated)
    throw new Error('Globe asset is stale. Run bun run globe:generate.');
  console.log('Globe asset matches the published geography.');
} else {
  await Bun.write(path, generated);
  console.log(`Generated globe (${Math.round(generated.length / 1024)} KB).`);
}
