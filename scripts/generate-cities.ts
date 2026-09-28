import { createHash } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { countryFeatures } from '../src/countries/geography';
import { selectSubdivisions, type SubdivisionSourceData } from './subdivision-data';
import { createCityDatabase, createCityParentIndex, parseAdminCodes, selectCities, type CityRegionFeature } from './city-data';
import naturalEarth from './data/subdivisions-source.json';
import source from './data/cities-source.json';

const { values } = parseArgs({ options: { check: { type: 'boolean' }, refresh: { type: 'boolean' } } });
if (values.check && values.refresh) throw new Error('Choose --check or --refresh.');
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const sourceFile = new URL('./data/cities-source.json', import.meta.url);
const snapshots = new URL('./data/cities/', import.meta.url);
const output = new URL('../src/cities/', import.meta.url);
const refreshed = new Map<string, Uint8Array<ArrayBuffer>>();

if (values.refresh) {
  for (const snapshot of source.snapshots) {
    if (snapshot.file === 'subdivisions.geojson.gz') snapshot.url = naturalEarth.url;
    const response = await fetch(snapshot.url);
    if (!response.ok) throw new Error(`City source download failed: HTTP ${response.status}`);
    const downloaded = new Uint8Array(await response.arrayBuffer());
    if (snapshot.file === 'subdivisions.geojson.gz' && hash(downloaded) !== naturalEarth.sha256)
      throw new Error('Natural Earth source checksum mismatch.');
    let contents = downloaded;
    if (snapshot.zipEntry) {
      const temporary = join(tmpdir(), `past-pins-cities-${crypto.randomUUID()}.zip`);
      await Bun.write(temporary, downloaded);
      try {
        const unzip = Bun.spawn(['unzip', '-p', temporary, snapshot.zipEntry], { stdout: 'pipe', stderr: 'pipe' });
        contents = new Uint8Array(await new Response(unzip.stdout).arrayBuffer());
        if (await unzip.exited !== 0) throw new Error('Unable to extract city source with unzip.');
      } finally {
        await rm(temporary, { force: true });
      }
    }
    const compressed = Bun.gzipSync(contents);
    refreshed.set(snapshot.file, compressed);
    snapshot.downloadSha256 = hash(downloaded);
    snapshot.contentSha256 = hash(contents);
    snapshot.sha256 = hash(compressed);
  }
  source.snapshotDate = new Date().toISOString().slice(0, 10);
}

const texts = new Map<string, string>();
for (const snapshot of source.snapshots) {
  const bytes = refreshed.get(snapshot.file) ?? await Bun.file(new URL(snapshot.file, snapshots)).bytes();
  if (hash(bytes) !== snapshot.sha256) throw new Error(`City snapshot checksum mismatch: ${snapshot.file}`);
  const contents = Bun.gunzipSync(bytes);
  if (hash(contents) !== snapshot.contentSha256) throw new Error(`City source checksum mismatch: ${snapshot.file}`);
  if (snapshot.file === 'subdivisions.geojson.gz' && snapshot.contentSha256 !== naturalEarth.sha256)
    throw new Error('City subdivision source changed. Run bun run cities:refresh.');
  texts.set(snapshot.file, new TextDecoder().decode(contents));
}
const inputs = {
  source: hash(JSON.stringify(source)),
  countries: hash(JSON.stringify(countryFeatures)),
  subdivisions: hash(JSON.stringify(naturalEarth)),
  bun: Bun.version,
  geometry: (await Bun.file(Bun.resolveSync('d3-geo/package.json', import.meta.dir)).json()).version as string,
  generator: hash((await Promise.all([
    new URL(import.meta.url),
    new URL('./city-data.ts', import.meta.url),
    new URL('./subdivision-data.ts', import.meta.url),
    new URL('../src/places/search.ts', import.meta.url),
  ].map((url) => Bun.file(url).text()))).join('\n')),
};
const manifestFile = Bun.file(new URL('manifest.json', output));
if (values.check) {
  const manifest = await manifestFile.json();
  if (JSON.stringify(manifest.inputs) !== JSON.stringify(inputs))
    throw new Error('City generator inputs changed. Run bun run cities:generate.');
  for (const [file, checksum] of Object.entries(manifest.outputs)) {
    if (hash(await Bun.file(new URL(file, output)).bytes()) !== checksum)
      throw new Error(`${file} is stale. Run bun run cities:generate.`);
  }
  console.log(`City assets verified (${manifest.cities} cities and towns; offline).`);
} else {
  const countryIds = new Set(countryFeatures.map(({ properties }) => properties.iso_a2.toLowerCase()));
  const upstream = JSON.parse(texts.get('subdivisions.geojson.gz')!) as SubdivisionSourceData;
  const { features, regions } = selectSubdivisions(upstream, countryIds);
  const { cities, excluded, linked } = selectCities(
    texts.get('cities500.txt.gz')!,
    parseAdminCodes(texts.get('admin1CodesASCII.txt.gz')!),
    parseAdminCodes(texts.get('admin2Codes.txt.gz')!),
    features as CityRegionFeature[],
    countryIds,
  );
  const outputs: Record<string, string> = {};
  const files = {
    'parents.json': new TextEncoder().encode(JSON.stringify(createCityParentIndex(cities)) + '\n'),
    'catalog.db': createCityDatabase(cities, new Map(countryFeatures.map(({ properties }) => [properties.iso_a2.toLowerCase(), properties.name])), regions),
  };
  for (const [file, bytes] of refreshed) await Bun.write(new URL(file, snapshots), bytes);
  if (values.refresh) await Bun.write(sourceFile, JSON.stringify(source, null, 2) + '\n');
  for (const [file, bytes] of Object.entries(files)) {
    await Bun.write(new URL(file, output), bytes);
    outputs[file] = hash(bytes);
    console.log(`Generated ${file} (${Math.round(bytes.length / 1024)} KB).`);
  }
  await Bun.write(manifestFile, JSON.stringify({ inputs, outputs, source, cities: cities.length, countries: new Set(cities.map((city) => city.countryId)).size, excluded, linked }, null, 2) + '\n');
  console.log(`Generated ${cities.length} cities and towns.`);
}
