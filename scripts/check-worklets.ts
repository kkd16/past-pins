import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { version } from 'react-native-worklets/package.json';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(root, 'dist/dev');
const bundlePath = process.argv[2] ?? resolve(
  output,
  (await Bun.file(resolve(output, 'metadata.json')).json()).fileMetadata.ios.bundle,
);
const bundle = await Bun.file(bundlePath).text();
const versions = new Map<string, number>();
for (const match of bundle.matchAll(/\.__pluginVersion\s*=\s*["']([^"']+)["']/g)) {
  versions.set(match[1], (versions.get(match[1]) ?? 0) + 1);
}

if (!versions.size)
  throw new Error('No Worklets metadata found. Check a development JavaScript bundle.');

const incompatible = [...versions].filter(([compiledVersion]) => compiledVersion !== version);
if (incompatible.length)
  throw new Error(
    `Worklets runtime ${version} has incompatible compiled functions: ${incompatible
      .map(([compiledVersion, count]) => `${count} from plugin ${compiledVersion}`)
      .join(', ')}.`,
  );

console.log(`All ${versions.get(version)} compiled worklets match runtime ${version}.`);
