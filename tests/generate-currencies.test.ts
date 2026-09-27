import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = new URL('../', import.meta.url);
const xml = await Bun.file(new URL('scripts/data/currencies.xml', project)).text();
const generated = await Bun.file(new URL('src/countries/fund-codes.json', project)).text();
let directory: string;
let source: ReturnType<typeof Bun.file>;
let output: ReturnType<typeof Bun.file>;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'pastpins-currencies-'));
  await mkdir(join(directory, 'scripts/data'), { recursive: true });
  await mkdir(join(directory, 'src/countries'), { recursive: true });
  await symlink(fileURLToPath(new URL('node_modules', project)), join(directory, 'node_modules'));
  for (const script of ['generate-currencies.ts', 'currency-data.ts'])
    await Bun.write(join(directory, 'scripts', script), Bun.file(new URL(`scripts/${script}`, project)));
  source = Bun.file(join(directory, 'scripts/data/currencies.xml'));
  output = Bun.file(join(directory, 'src/countries/fund-codes.json'));
  await Bun.write(source, xml);
  await Bun.write(output, generated);
  await Bun.write(join(directory, 'response.json'), 'null');
  await Bun.write(join(directory, 'mock-fetch.ts'), `
    globalThis.fetch = async () => {
      const response = await Bun.file(new URL('./response.json', import.meta.url)).json();
      if (!response) throw new Error('Unexpected network request');
      return new Response(response.body, { status: response.status });
    };
  `);
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

function run(...args: string[]) {
  return Bun.spawnSync({
    cmd: [process.execPath, '--preload', './mock-fetch.ts', './scripts/generate-currencies.ts', ...args],
    cwd: directory,
    stdout: 'pipe',
    stderr: 'pipe',
  });
}

test('check is offline, detects stale output without writing, and generation repairs it', async () => {
  expect(run('--check').exitCode).toBe(0);
  await Bun.write(output, '{}\n');
  expect(run('--check').exitCode).not.toBe(0);
  expect(await output.text()).toBe('{}\n');
  expect(run().exitCode).toBe(0);
  expect(await output.text()).toBe(generated);
  expect(await source.text()).toBe(xml);
  expect(run('--check').exitCode).toBe(0);
});

test('refresh updates both files, reports changes, and reproduces offline', async () => {
  const next = xml.replace(/Pblshd="[^"]+"/, 'Pblshd="2099-01-01"').replace('<Ccy>USN</Ccy>', '<Ccy>ABC</Ccy>');
  await Bun.write(join(directory, 'response.json'), JSON.stringify({ status: 200, body: next }));
  const result = run('--refresh');
  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString()).toContain('added: ABC; removed: USN');
  expect(await source.text()).toBe(next);
  const updated = await output.json();
  expect(updated.published).toBe('2099-01-01');
  expect(updated.codes).toContain('ABC');
  expect(updated.codes).not.toContain('USN');
  await Bun.write(join(directory, 'response.json'), 'null');
  expect(run('--check').exitCode).toBe(0);
  expect(run().exitCode).toBe(0);
  expect(await output.json()).toEqual(updated);
});

test.each([
  { status: 503, body: 'Unavailable' },
  { status: 200, body: '<html>Unavailable</html>' },
  { status: 200, body: xml.replace(/Pblshd="[^"]+"/, 'Pblshd="2000-01-01"') },
])('failed refresh preserves both files %#', async (response) => {
  await Bun.write(join(directory, 'response.json'), JSON.stringify(response));
  expect(run('--refresh').exitCode).not.toBe(0);
  expect(await source.text()).toBe(xml);
  expect(await output.text()).toBe(generated);
});

test('network failures and conflicting flags preserve both files', async () => {
  expect(run('--refresh').exitCode).not.toBe(0);
  expect(run('--check', '--refresh').exitCode).not.toBe(0);
  expect(await source.text()).toBe(xml);
  expect(await output.text()).toBe(generated);
});
