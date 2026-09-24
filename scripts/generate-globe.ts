import { parseArgs } from 'node:util';

import { generateGlobe } from './globe-geometry';
import { generateFlatMap } from './flat-map';

const { values } = parseArgs({ options: { check: { type: 'boolean' } } });
for (const [name, data] of [
  ['globe', generateGlobe()],
  ['atlas', generateFlatMap()],
] as const) {
  const path = new URL(`../src/${name}/world.json`, import.meta.url);
  // Nine significant digits retain GPU float precision.
  const generated =
    JSON.stringify(data, (_key, value) =>
      typeof value === 'number' ? Number(value.toPrecision(9)) : value,
    ) + '\n';
  if (values.check) {
    if (
      !(await Bun.file(path).exists()) ||
      (await Bun.file(path).text()) !== generated
    )
      throw new Error(`${name} asset is stale. Run bun run globe:generate.`);
    console.log(`${name} asset matches the published geography.`);
  } else {
    await Bun.write(path, generated);
    console.log(`Generated ${name} (${Math.round(generated.length / 1024)} KB).`);
  }
}
