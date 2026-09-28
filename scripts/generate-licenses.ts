import { rename, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import sourceData from '../licenses/sources.json';
import { mergeNotices, packageNotice, readNotice, type LicenseSource, type Notice } from './license-data';
import { autolinkedPackages, nativeNotices } from './native-license-data';

const { values } = parseArgs({ options: {
  check: { type: 'boolean' },
  native: { type: 'boolean' },
} });
const root = resolve(import.meta.dir, '..');
const sources = sourceData as LicenseSource[];
const output = join(root, 'licenses/notices.json');
const inventory = Bun.spawnSync([process.execPath, 'pm', 'licenses', '--json'], { cwd: root, stdout: 'pipe', stderr: 'pipe' });
if (inventory.exitCode !== 0) throw new Error(inventory.stderr.toString());
const inventoryPackages = Object.values(JSON.parse(inventory.stdout.toString()) as Record<string, { paths: string[] }[]>).flat();
const paths = [...new Set(inventoryPackages.flatMap((pkg) => pkg.paths))].sort();
if (!paths.length) throw new Error('Bun returned an empty dependency inventory.');
const packages = await Promise.all(paths.map(async (path) => {
  const pkg = await Bun.file(join(path, 'package.json')).json();
  return { path, id: `${pkg.name}@${pkg.version}` };
}));
const notices: Notice[] = [];
const grouped = new Set(sources.flatMap((source) => source.includes ?? []));
for (const { path } of packages.filter((pkg) => !grouped.has(pkg.id))) {
  notices.push(await packageNotice(root, path, sources));
}
const credited = new Set(notices.map((notice) => `${notice.name}@${notice.version}`));
for (const { id } of packages.filter((pkg) => grouped.has(pkg.id))) {
  if (!sources.some((source) => source.includes?.includes(id) && source.packages.some((parent) => credited.has(parent)))) {
    throw new Error(`Missing license owner for ${id}.`);
  }
}
const project = await Bun.file(join(root, 'package.json')).json();
notices.push({
  name: 'PastPins', version: project.version, license: 'GPL-3.0-or-later with Apple App Store permission',
  text: (await Promise.all(['NOTICE', 'LICENSE', 'COPYING.iOS'].map(async (file) => `${file}\n\n${await readNotice(join(root, file))}`))).join('\n\n---\n\n'),
}, {
  name: 'Expo local-module template', version: 'SDK 57', license: 'MIT',
  text: await readNotice(join(root, 'modules/past-pins-recovery/LICENSE')),
});
const subdivisions = await Bun.file(join(root, 'scripts/data/subdivisions-source.json')).json();
const cities = await Bun.file(join(root, 'scripts/data/cities-source.json')).json();
notices.push({
  name: 'Natural Earth Admin 1', version: subdivisions.version, license: subdivisions.license,
  text: await readNotice(join(root, 'licenses/natural-earth-public-domain.md')),
}, {
  name: 'GeoNames', version: cities.snapshotDate, license: cities.license,
  text: await readNotice(join(root, 'licenses/geonames-CC-BY-4.0.md')),
});

const merged = values.native ? await nativeNotices(root, notices, sources, autolinkedPackages(root)) : mergeNotices(notices);
const generated = JSON.stringify(merged, null, 2) + '\n';
if (values.check) {
  if (!(await Bun.file(output).exists()) || await Bun.file(output).text() !== generated) throw new Error('License notices are stale. Run bun run licenses:generate.');
  console.log(`Verified ${merged.length} notices against all installed dependencies${values.native ? ' and CocoaPods' : ''}.`);
} else {
  const pending = `${output}.${process.pid}.tmp`;
  try {
    await Bun.write(pending, generated);
    await rename(pending, output);
  } finally {
    await rm(pending, { force: true });
  }
  console.log(`Generated ${merged.length} license notices${values.native ? ', including CocoaPods' : ''}.`);
}
