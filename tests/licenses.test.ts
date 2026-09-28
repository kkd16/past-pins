import plist from '@expo/plist';
import { afterEach, expect, test } from 'bun:test';
import { cp, mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { mergeNotices, packageNotice, type LicenseSource, type Notice } from '../scripts/license-data';
import { autolinkedPackages, nativeNotices, podNotices, parsePodLock } from '../scripts/native-license-data';

const project = join(import.meta.dir, '..');
const license = await Bun.file(join(project, 'node_modules/react/LICENSE')).text();
const notice: Notice = { name: 'example', version: '1.0.0', license: 'MIT', text: license };
const directories: string[] = [];

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'pastpins-licenses-test-'));
  directories.push(root);
  return root;
}

async function writePackage(root: string, name: string, text = license) {
  const path = join(root, 'node_modules', name);
  await Bun.write(join(path, 'package.json'), JSON.stringify({ name, version: '1.0.0', license: 'MIT' }));
  if (text) await Bun.write(join(path, 'LICENSE'), text);
  return path;
}

async function writePods(root: string, lock: string, entries: { Title: string; FooterText?: string; License?: string }[] = []) {
  await Bun.write(join(root, 'ios/Podfile.lock'), lock);
  await Bun.write(join(root, 'ios/Pods/Manifest.lock'), lock);
  await Bun.write(join(root, 'ios/Pods/Target Support Files/Pods-App/Pods-App-acknowledgements.plist'), plist.build({
    PreferenceSpecifiers: [{ Title: 'Acknowledgements', FooterText: 'Boilerplate' }, ...entries, { Title: '' }],
  }));
}

async function writeAutolinking(root: string) {
  const path = join(root, 'node_modules/expo/bin/autolinking');
  await Bun.write(path, `const data = ${JSON.stringify({
    resolve: { modules: [{ packageName: 'example', packageVersion: '1.0.0', pods: [{ podName: 'ExampleNative', podspecDir: join(root, 'node_modules/example/ios') }] }] },
    'react-native-config': { dependencies: { tooling: { platforms: { ios: { version: '1.0.0', podspecPath: join(root, 'node_modules/tooling/Tooling.podspec') } } }, disabled: { platforms: { ios: null } } } },
  })}; process.stdout.write(JSON.stringify(data[process.argv[2]]));`);
  return path;
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test('package notices retain nested vendor credits and exclude other installed packages', async () => {
  const root = await fixture();
  const path = await writePackage(root, 'example');
  await Bun.write(join(path, 'vendor/THIRD-PARTY-LICENSES.txt'), `Vendor credit\n${license}`);
  await Bun.write(join(path, 'ThirdPartyNoticeText.txt'), `TypeScript-style third-party credit\n${license}`);
  await Bun.write(join(path, 'node_modules/unrelated/LICENSE'), 'Unrelated credit');
  const result = await packageNotice(root, path, []);
  expect(result.text).toContain(license.trim());
  expect(result.text).toContain('Vendor credit');
  expect(result.text).toContain('TypeScript-style third-party credit');
  expect(result.text).not.toContain('Unrelated credit');
});

test('short copyright notices are retained alongside the license', async () => {
  const root = await fixture();
  const path = await writePackage(root, 'example');
  await Bun.write(join(path, 'NOTICE'), 'Copyright 2026 Example contributors.');
  const result = await packageNotice(root, path, []);
  expect(result.text).toContain('Copyright 2026 Example contributors.');
  expect(result.text).toContain(license.trim());
});

test('missing license text requires a reviewed, versioned source', async () => {
  const root = await fixture();
  const path = await writePackage(root, 'example', '');
  await expect(packageNotice(root, path, [])).rejects.toThrow('Missing license text for example@1.0.0');
  await Bun.write(join(root, 'upstream.txt'), license);
  const sources: LicenseSource[] = [{ packages: ['example@1.0.0'], file: 'upstream.txt', url: 'https://example.com/LICENSE', attribution: 'Original author credit' }];
  const result = await packageNotice(root, path, sources);
  expect(result.text).toContain('Original author credit');
  expect(result.text).toContain('https://example.com/LICENSE');
  await Bun.write(join(path, 'package.json'), JSON.stringify({ name: 'example', version: '1.0.1', license: 'MIT' }));
  await expect(packageNotice(root, path, sources)).rejects.toThrow('Review supplementary notices for example@1.0.1');
  await expect(packageNotice(root, path, [
    ...sources, { ...sources[0], packages: ['example@1.0.1'] },
  ])).rejects.toThrow('Review supplementary notices for example@1.0.1');
});

test('notice merging keeps distinct versions and credits without mutating inputs', () => {
  const extended = { ...notice, text: `Vendor credit\n${license.trim()}` };
  const nextVersion = { ...notice, version: '2.0.0' };
  const additional = { ...notice, text: `Additional author\n${license.trim()}` };
  expect(mergeNotices([notice, extended, nextVersion, extended, additional])).toEqual([
    { ...extended, text: `${extended.text}\n\n---\n\n${additional.text}` }, nextVersion,
  ].map((item) => ({ ...item, text: item.text.trim() })));
  expect(notice.text).toBe(license);
  for (const text of ['', 'MIT', 'The installed package declares the MIT license but does not include its license text.']) {
    expect(() => mergeNotices([{ ...notice, text }])).toThrow('Missing license text');
  }
});

test('CocoaPods root and subspec versions are read with real plist metadata', () => {
  const { versions } = parsePodLock('PODS:\n  - Example/Core (1.0.0):\n    - Other\n  - Example/UI (1.0.0)\n  - Other (2.0.0)\n');
  expect([...versions]).toEqual([['Example', '1.0.0'], ['Other', '2.0.0']]);
  const xml = plist.build({ PreferenceSpecifiers: [
    { Title: 'Acknowledgements', FooterText: 'Boilerplate' },
    { Title: 'Example', FooterText: license, License: 'MIT' },
    { Title: 'Other', FooterText: license },
    { Title: '' },
  ] });
  expect(podNotices(xml, versions).map(({ name, version, license }) => ({ name, version, license }))).toEqual([
    { name: 'Example', version: '1.0.0', license: 'MIT' }, { name: 'Other', version: '2.0.0', license: '' },
  ]);
  expect(() => parsePodLock('PODS:\n  - Example (1)\n  - Example/Core (2)')).toThrow('Conflicting');
  expect(() => parsePodLock('PODS:\n  - null')).toThrow('Invalid CocoaPods dependency');
  expect(() => parsePodLock('PODS:\n  - Example (1): []\n    Other (2): []')).toThrow('Invalid CocoaPods dependency');
  expect(() => parsePodLock('PODS: []')).toThrow('Missing PODS');
  expect(() => podNotices(plist.build({}), versions)).toThrow('Invalid CocoaPods acknowledgments');
  expect(() => podNotices(plist.build({ PreferenceSpecifiers: [{ Title: 'Acknowledgements' }, { Title: 'Example' }, { Title: '' }] }), versions)).toThrow('Missing license text');
});

test('native merge covers local npm pods, generated pods, native-only libraries, and duplicate targets', async () => {
  const root = await fixture();
  const path = await writePackage(root, 'example');
  const base = await packageNotice(root, path, []);
  await writePods(root, `PODS:
  - ExampleNative (1.0.0)
  - Generated (1.0.0)
  - NativeOnly (2.0.0)
  - PastPinsRecovery (1.0.0)
EXTERNAL SOURCES:
  ExampleNative:
    :path: ../node_modules/example/ios
  Generated:
    :path: build/generated/ios
  PastPinsRecovery:
    :path: ../modules/past-pins-recovery/ios
`, [
    { Title: 'ExampleNative', FooterText: `Extra native author\n${license}` },
    { Title: 'NativeOnly', FooterText: license },
  ]);
  const first = join(root, 'ios/Pods/Target Support Files/Pods-App/Pods-App-acknowledgements.plist');
  await Bun.write(join(root, 'ios/Pods/Target Support Files/Pods-Tests/Pods-Tests-acknowledgements.plist'), await Bun.file(first).text());
  const sources: LicenseSource[] = [{ packages: ['example@1.0.0'], file: 'node_modules/example/LICENSE', url: 'https://example.com/LICENSE', pods: { Generated: '1.0.0' } }];
  const merged = await nativeNotices(`${root}/`, [base, { ...notice, name: 'PastPins' }], sources);
  expect(merged.map((entry) => entry.name)).toEqual(['example', 'ExampleNative', 'NativeOnly', 'PastPins']);
  expect(merged.find((entry) => entry.name === 'ExampleNative')?.text).toContain('Extra native author');
  expect(merged.find((entry) => entry.name === 'NativeOnly')?.version).toBe('2.0.0');
  expect(merged.find((entry) => entry.name === 'example')?.text.match(/Copyright/g)).toHaveLength(1);
});

test('remote podspecs require their own notice or a reviewed owner', async () => {
  const root = await fixture();
  const path = await writePackage(root, 'example');
  const base = await packageNotice(root, path, []);
  const lock = `PODS:
  - RemoteLibrary (2.0.0)
EXTERNAL SOURCES:
  RemoteLibrary:
    :podspec: ../node_modules/example/third-party/RemoteLibrary.podspec
`;
  await writePods(root, lock);
  await expect(nativeNotices(root, [base], [])).rejects.toThrow('Missing CocoaPods license text for RemoteLibrary');
  await writePods(root, lock, [{ Title: 'RemoteLibrary', FooterText: license }]);
  expect((await nativeNotices(root, [base], [])).map((item) => item.name)).toContain('RemoteLibrary');
  await writePods(root, lock);
  const sources: LicenseSource[] = [{ packages: ['example@1.0.0'], file: 'node_modules/example/LICENSE', url: 'https://example.com/LICENSE', pods: { RemoteLibrary: '2.0.0' } }];
  expect(await nativeNotices(root, [base], sources)).toEqual([base]);
  await writePods(root, lock, [{ Title: 'RemoteLibrary', FooterText: license }]);
  await expect(nativeNotices(root, [], sources)).rejects.toThrow('Missing supplemental license owner for RemoteLibrary');
});

test('Expo autolinking identifies only registered precompiled packages and propagates CLI failures', async () => {
  const root = await fixture();
  const path = await writePackage(root, 'example');
  const base = await packageNotice(root, path, []);
  const cli = await writeAutolinking(root);
  const packages = autolinkedPackages(root);
  expect([...packages]).toEqual([
    [join(path, 'ios/ExampleNative.podspec'), 'example@1.0.0'],
    [join(root, 'node_modules/tooling/Tooling.podspec'), 'tooling@1.0.0'],
  ]);
  await writePods(root, `PODS:
  - ExampleNative (1.0.0)
EXTERNAL SOURCES:
  ExampleNative:
    :podspec: ../node_modules/example/ios/ExampleNative.podspec
`);
  expect(await nativeNotices(root, [base], [], packages)).toEqual([base]);
  await expect(nativeNotices(root, [{ ...base, version: '2.0.0' }], [], packages)).rejects.toThrow('Missing CocoaPods license text');
  await Bun.write(cli, 'process.stderr.write("Failed to resolve modules"); process.exit(1);');
  expect(() => autolinkedPackages(root)).toThrow('Expo autolinking failed: Failed to resolve modules');
});

test('native notices reject stale acknowledgments and cannot exempt a remote pod by its name', async () => {
  const root = await fixture();
  const path = await writePackage(root, 'example');
  const base = await packageNotice(root, path, []);
  await writePods(root, `PODS:
  - ExampleNative (1.0.0)
EXTERNAL SOURCES:
  ExampleNative:
    :path: ../node_modules/example
`, [{ Title: 'RemovedPod', FooterText: license }]);
  await expect(nativeNotices(root, [base], [])).rejects.toThrow('Unknown CocoaPods acknowledgment: RemovedPod');
  await writePods(root, 'PODS:\n  - PastPinsRecovery (1.0.0)');
  await expect(nativeNotices(root, [{ ...notice, name: 'PastPins' }], [])).rejects.toThrow('Missing CocoaPods license text for PastPinsRecovery');
});

test('native generation rejects incomplete coverage, changed binary versions, and stale installations', async () => {
  const root = await fixture();
  await writePods(root, 'PODS:\n  - Uncovered (1.0.0)\n');
  await expect(nativeNotices(root, [], [])).rejects.toThrow('Missing CocoaPods license text for Uncovered');
  const sources: LicenseSource[] = [{ packages: ['example@1.0.0'], file: 'unused.txt', url: 'https://example.com/LICENSE', pods: { Uncovered: '2.0.0' } }];
  await expect(nativeNotices(root, [notice], sources)).rejects.toThrow('Review supplementary notices for Uncovered 1.0.0');
  await Bun.write(join(root, 'ios/Pods/Manifest.lock'), 'PODS: []');
  await expect(nativeNotices(root, [], [])).rejects.toThrow('Run pod install');
  await Bun.write(join(root, 'ios/Pods/Manifest.lock'), await Bun.file(join(root, 'ios/Podfile.lock')).text());
  await rm(join(root, 'ios/Pods/Target Support Files'), { recursive: true });
  await expect(nativeNotices(root, [], [])).rejects.toThrow('Missing CocoaPods acknowledgments');
});

async function cliFixture() {
  const root = await fixture();
  await Bun.write(join(root, 'package.json'), JSON.stringify({
    name: 'license-fixture', version: '1.0.0', private: true,
    dependencies: { example: 'file:./example' }, devDependencies: { tooling: 'file:./tooling', 'example-binding': 'file:./example-binding' },
  }));
  for (const name of ['example', 'tooling', 'example-binding']) {
    await Bun.write(join(root, name, 'package.json'), JSON.stringify({ name, version: '1.0.0', license: 'MIT' }));
    await Bun.write(join(root, name, 'LICENSE'), license);
  }
  const install = Bun.spawnSync([process.execPath, 'install', '--ignore-scripts'], { cwd: root });
  expect(install.exitCode).toBe(0);
  await Bun.write(join(root, 'scripts/data/subdivisions-source.json'), JSON.stringify({ version: '1', license: 'Public domain' }));
  await Bun.write(join(root, 'scripts/data/cities-source.json'), JSON.stringify({ snapshotDate: '2026-09-27', license: 'CC-BY-4.0' }));
  await Bun.write(join(root, 'licenses/sources.json'), JSON.stringify([{
    packages: ['example@1.0.0'], file: 'node_modules/example/LICENSE', url: 'https://example.com/LICENSE',
    includes: ['example-binding@1.0.0', 'example-other-platform@1.0.0'],
  }]));
  for (const path of ['LICENSE', 'NOTICE', 'COPYING.iOS', 'modules/past-pins-recovery/LICENSE', 'licenses/natural-earth-public-domain.md', 'licenses/geonames-CC-BY-4.0.md']) {
    await Bun.write(join(root, path), license);
  }
  await cp(join(project, 'scripts/generate-licenses.ts'), join(root, 'scripts/generate-licenses.ts'));
  for (const file of ['license-data.ts', 'native-license-data.ts']) {
    await symlink(join(project, 'scripts', file), join(root, 'scripts', file));
  }
  await writeAutolinking(root);
  const run = (...args: string[]) => Bun.spawnSync([process.execPath, 'scripts/generate-licenses.ts', ...args], { cwd: root });
  return { root, run, output: join(root, 'licenses/notices.json') };
}

test('license CLI includes dev dependencies, detects stale output, and preserves output on failure', async () => {
  const { root, run, output } = await cliFixture();
  expect(run().exitCode).toBe(0);
  const generated = await Bun.file(output).text();
  const entries = JSON.parse(generated) as Notice[];
  expect(entries.map((entry) => entry.name)).toContain('tooling');
  expect(entries.map((entry) => entry.name)).not.toContain('example-binding');
  expect(entries.find((entry) => entry.name === 'example')?.text).toContain('example-binding@1.0.0\nexample-other-platform@1.0.0');
  expect(run('--check').exitCode).toBe(0);
  await rm(output);
  expect(run('--check').stderr.toString()).toContain('License notices are stale');
  expect(await Bun.file(output).exists()).toBe(false);
  await Bun.write(output, generated);
  await Bun.write(join(root, 'LICENSE'), '');
  expect(run().stderr.toString()).toContain('Missing license text');
  expect(await Bun.file(output).text()).toBe(generated);
  await Bun.write(join(root, 'LICENSE'), license);
  await Bun.write(output, 'previous output');
  expect(run('--check').stderr.toString()).toContain('License notices are stale');
  expect(await Bun.file(output).text()).toBe('previous output');
  await Bun.write(output, generated);
  await Bun.write(join(root, 'node_modules/tooling/LICENSE'), 'MIT');
  expect(run().stderr.toString()).toContain('Missing license text for tooling');
  expect(await Bun.file(output).text()).toBe(generated);
  expect(await Array.fromAsync(new Bun.Glob('licenses/*.tmp').scan(root))).toEqual([]);
  await Bun.write(join(root, 'node_modules/tooling/LICENSE'), license);
  await writePods(root, 'PODS:\n  - Uncovered (1.0.0)');
  expect(run('--native').stderr.toString()).toContain('Missing CocoaPods license text for Uncovered');
  expect(await Bun.file(output).text()).toBe(generated);
  await Bun.write(join(root, 'licenses/sources.json'), JSON.stringify([{
    packages: ['absent@1.0.0'], file: 'unused.txt', url: 'https://example.com/LICENSE', includes: ['example-binding@1.0.0'],
  }]));
  expect(run().stderr.toString()).toContain('Missing license owner for example-binding@1.0.0');
  expect(await Bun.file(output).text()).toBe(generated);
  await Bun.write(join(root, 'licenses/sources.json'), JSON.stringify([
    { packages: ['example@1.0.0'], file: 'node_modules/example/LICENSE', url: 'https://example.com/LICENSE', includes: ['example-binding@1.0.0'] },
    { packages: ['example-binding@1.0.0'], file: 'node_modules/example/LICENSE', url: 'https://example.com/LICENSE', includes: ['example@1.0.0'] },
  ]));
  expect(run().stderr.toString()).toContain('Missing license owner');
  expect(await Bun.file(output).text()).toBe(generated);
});

test('license CLI merges and verifies native notices, and concurrent generation leaves a complete file', async () => {
  const { root, run, output } = await cliFixture();
  expect(run().exitCode).toBe(0);
  const baseline = await Bun.file(output).text();
  await writePods(root, `PODS:
  - ExampleNative (1.0.0)
  - NativeOnly (2.0.0)
EXTERNAL SOURCES:
  ExampleNative:
    :podspec: ../node_modules/example/ios/ExampleNative.podspec
`, [{ Title: 'NativeOnly', FooterText: license }]);
  expect(run('--native').exitCode).toBe(0);
  const native = await Bun.file(output).text();
  expect((JSON.parse(native) as Notice[]).map((entry) => entry.name)).toContain('NativeOnly');
  expect(run('--native', '--check').exitCode).toBe(0);
  expect(run('--check').stderr.toString()).toContain('License notices are stale');
  expect(await Bun.file(output).text()).toBe(native);
  const concurrent = [0, 1].map(() => Bun.spawn([process.execPath, 'scripts/generate-licenses.ts'], { cwd: root, stdout: 'pipe', stderr: 'pipe' }));
  expect(await Promise.all(concurrent.map((child) => child.exited))).toEqual([0, 0]);
  expect(await Bun.file(output).text()).toBe(baseline);
  expect(await Array.fromAsync(new Bun.Glob('licenses/*.tmp').scan(root))).toEqual([]);
});
