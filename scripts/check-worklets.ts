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
let count = 0;
for (const [, pluginVersion] of bundle.matchAll(/\.__pluginVersion\s*=\s*["']([^"']+)["']/g)) {
  if (pluginVersion !== version)
    throw new Error(`Worklets runtime ${version} does not match compiled plugin ${pluginVersion}.`);
  count++;
}

if (!count)
  throw new Error('No Worklets metadata found. Check a development JavaScript bundle.');

console.log(`All ${count} compiled worklets match runtime ${version}.`);
