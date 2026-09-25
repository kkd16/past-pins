import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { countryFeatures } from '../src/countries/geography';
import source from './data/subdivisions-source.json';
import {
  generateSubdivisionMaps,
  selectSubdivisions,
  type SubdivisionSourceData,
} from './subdivision-data';

const { values } = parseArgs({
  options: {
    check: { type: 'boolean' },
    refresh: { type: 'boolean' },
  },
});
if (values.check && values.refresh)
  throw new Error('Choose --check or --refresh.');

const countryIds = new Set(
  countryFeatures.map(({ properties }) => properties.iso_a2.toLowerCase()),
);
const hash = (value: string | Uint8Array) =>
  createHash('sha256').update(value).digest('hex');
const output = new URL('../src/subdivisions/', import.meta.url);
const inputs = {
  source: hash(JSON.stringify(source)),
  countries: hash(JSON.stringify(countryFeatures)),
  projectionVersion: (
    await Bun.file(
      Bun.resolveSync('d3-geo/package.json', import.meta.dir),
    ).json()
  ).version as string,
  generator: hash(
    [
      await Bun.file(new URL(import.meta.url)).text(),
      await Bun.file(new URL('./subdivision-data.ts', import.meta.url)).text(),
      await Bun.file(
        new URL('../src/countries/geography.ts', import.meta.url),
      ).text(),
    ].join('\n'),
  ),
};
const manifestFile = Bun.file(new URL('manifest.json', output));

if (values.check) {
  // CI stays offline: recorded output digests and exact generator/input digests
  // detect source, code, country-catalog, and generated-file drift. --refresh
  // fetches and verifies the upstream snapshot before reproducing the outputs.
  const manifest = await manifestFile.json();
  if (JSON.stringify(manifest.inputs) !== JSON.stringify(inputs)) {
    throw new Error(
      'Subdivision generator inputs changed. Run bun run subdivisions:generate.',
    );
  }
  for (const name of ['catalog.json', 'maps.json']) {
    if (
      hash(await Bun.file(new URL(name, output)).text()) !==
      manifest.outputs[name]
    ) {
      throw new Error(`${name} is stale. Run bun run subdivisions:generate.`);
    }
  }
  console.log(
    `Subdivision assets verified (${manifest.regions} regions, ${manifest.countries} countries/territories; offline).`,
  );
} else {
  const cache = Bun.file(
    join(tmpdir(), `pastpins-natural-earth-${source.sha256}.geojson`),
  );
  if (values.refresh || !(await cache.exists())) {
    console.log(
      `Downloading ${source.name} ${source.release} subdivision source…`,
    );
    const response = await fetch(source.url);
    if (!response.ok)
      throw new Error(`Source download failed: HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (hash(bytes) !== source.sha256)
      throw new Error('Upstream subdivision checksum mismatch.');
    await Bun.write(cache, bytes);
  }
  const text = await cache.text();
  if (hash(text) !== source.sha256)
    throw new Error('Cached subdivision checksum mismatch; use --refresh.');
  const upstream = JSON.parse(text) as SubdivisionSourceData;
  const { regions, features, excluded } = selectSubdivisions(
    upstream,
    countryIds,
  );
  const maps = generateSubdivisionMaps(features, countryFeatures);
  const files = {
    'catalog.json': JSON.stringify({ source, regions }) + '\n',
    'maps.json': JSON.stringify(maps) + '\n',
  };
  const outputs: Record<string, string> = {};
  for (const [name, contents] of Object.entries(files)) {
    await Bun.write(new URL(name, output), contents);
    outputs[name] = hash(contents);
    console.log(
      `Generated ${name} (${Math.round(contents.length / 1024)} KB).`,
    );
  }
  await Bun.write(
    manifestFile,
    JSON.stringify(
      {
        inputs,
        outputs,
        sourceFeatures: upstream.features.length,
        regions: regions.length,
        countries: Object.keys(maps).length,
        excluded,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `Generated ${regions.length} regions across ${Object.keys(maps).length} countries/territories.`,
  );
}
