import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

type InventoryPackage = {
  name: string;
  license: string;
  paths: string[];
  homepage?: string;
};
type Notice = { name: string; version: string; license: string; text: string };

const { values } = parseArgs({ options: { check: { type: 'boolean' } } });
const root = fileURLToPath(new URL('..', import.meta.url));
const output = join(root, 'licenses/notices.json');
const result = Bun.spawnSync({
  cmd: [process.execPath, 'pm', 'licenses', '--prod', '--json'],
  cwd: root,
  stdout: 'pipe',
  stderr: 'pipe',
});
if (result.exitCode !== 0) throw new Error(result.stderr.toString());
const inventory = Object.values(
  JSON.parse(result.stdout.toString()) as Record<string, InventoryPackage[]>,
).flat();
const earcutPath = join(root, 'node_modules/earcut');
const earcut = await Bun.file(join(earcutPath, 'package.json')).json();
inventory.push({
  name: earcut.name,
  license: earcut.license,
  paths: [earcutPath],
});

function licenseFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name === '.git') return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return licenseFiles(path);
    return entry.isFile() &&
      /^(licen[cs]e|copying|notice)([._-]|$)/i.test(entry.name)
      ? [path]
      : [];
  });
}

const notices = new Map<string, Notice>();
const missing: string[] = [];
for (const pkg of inventory) {
  for (const directory of pkg.paths) {
    const { name, version } = await Bun.file(
      join(directory, 'package.json'),
    ).json();
    const id = `${name}@${version}`;
    if (notices.has(id)) continue;
    const files = licenseFiles(directory).sort();
    const texts = await Promise.all(
      files.map(
        async (path) =>
          `${relative(directory, path)}\n\n${(await Bun.file(path).text()).replaceAll('\r\n', '\n').trim()}`,
      ),
    );
    if (name === '@rembish/iso-topojson') {
      texts.push(
        await Bun.file(join(root, 'licenses/iso-topojson-CC-BY-4.0.md')).text(),
      );
    }
    if (!texts.length) {
      missing.push(id);
      texts.push(
        `The installed package declares the ${pkg.license} license but does not include its license text.`,
      );
      if (pkg.homepage) texts.push(`Project: ${pkg.homepage}`);
    }
    notices.set(id, {
      name,
      version,
      license: pkg.license,
      text: texts.join('\n\n---\n\n'),
    });
  }
}

const generated =
  JSON.stringify(
    [...notices.values()].sort(
      (a, b) =>
        a.name.localeCompare(b.name, 'en') ||
        a.version.localeCompare(b.version, 'en'),
    ),
    null,
    2,
  ) + '\n';
if (values.check) {
  if (
    !(await Bun.file(output).exists()) ||
    (await Bun.file(output).text()) !== generated
  ) {
    throw new Error(
      'Third-party notices are stale. Run bun run licenses:generate.',
    );
  }
  console.log(`Third-party notices match ${notices.size} installed packages.`);
} else {
  await Bun.write(output, generated);
  console.log(
    `Generated ${notices.size} third-party notices (${Math.round(generated.length / 1024)} KB).`,
  );
}
if (missing.length)
  console.warn(
    `${missing.length} packages omit license texts; their notices preserve declared licenses and project links.`,
  );
