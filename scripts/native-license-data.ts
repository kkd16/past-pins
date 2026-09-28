import plist from '@expo/plist';
import { dirname, join, resolve, sep } from 'node:path';

import { mergeNotices, packageNotice, requireNotice, type LicenseSource, type Notice } from './license-data';

export function autolinkedPackages(root: string): Map<string, string> {
  const cli = require.resolve('expo/bin/autolinking', { paths: [root] });
  const run = (command: string) => {
    const result = Bun.spawnSync([process.execPath, cli, command, '--json', '--platform', 'ios'], { cwd: root, stdout: 'pipe', stderr: 'pipe' });
    if (result.exitCode !== 0) throw new Error(`Expo autolinking failed: ${result.stderr.toString()}`);
    return JSON.parse(result.stdout.toString());
  };
  const expo = run('resolve') as { modules: { packageName: string; packageVersion: string; pods: { podName: string; podspecDir: string }[] }[] };
  const reactNative = run('react-native-config') as { dependencies: Record<string, { platforms: { ios?: { podspecPath: string; version: string } | null } }> };
  const packages = new Map<string, string>();
  for (const module of expo.modules) {
    for (const pod of module.pods) packages.set(join(pod.podspecDir, `${pod.podName}.podspec`), `${module.packageName}@${module.packageVersion}`);
  }
  for (const [name, module] of Object.entries(reactNative.dependencies)) {
    const ios = module.platforms.ios;
    if (ios) packages.set(ios.podspecPath, `${name}@${ios.version}`);
  }
  return packages;
}

export function parsePodLock(lockfile: string) {
  const parsed = Bun.YAML.parse(lockfile) as {
    PODS?: unknown[];
    'EXTERNAL SOURCES'?: Record<string, { ':path'?: string; ':podspec'?: string }>;
  };
  if (!Array.isArray(parsed?.PODS) || !parsed.PODS.length) throw new Error('Missing PODS in the CocoaPods lockfile.');
  const versions = new Map<string, string>();
  for (const entry of parsed.PODS) {
    const keys = entry && typeof entry === 'object' ? Object.keys(entry) : [];
    const value = typeof entry === 'string' ? entry : keys.length === 1 ? keys[0] : '';
    const match = /^([^ /]+)(?:\/[^ ]+)? \(([^ )]+)\)$/.exec(value);
    if (!match) throw new Error(`Invalid CocoaPods dependency: ${value}`);
    const [, name, version] = match;
    if (versions.has(name) && versions.get(name) !== version) throw new Error(`Conflicting CocoaPods versions for ${name}.`);
    versions.set(name, version);
  }
  return { versions, external: parsed['EXTERNAL SOURCES'] ?? {} };
}

export function podNotices(xml: string, versions: Map<string, string>): Notice[] {
  const parsed = plist.parse(xml) as { PreferenceSpecifiers?: { Title?: string; FooterText?: string; License?: string }[] };
  const entries = parsed?.PreferenceSpecifiers;
  if (!Array.isArray(entries) || entries.length < 2 || entries[0]?.Title !== 'Acknowledgements' || entries.at(-1)?.Title !== '') {
    throw new Error('Invalid CocoaPods acknowledgments.');
  }
  return entries.slice(1, -1).map(({ Title: name, FooterText: text = '', License: license = '' }) => {
    const version = name && versions.get(name);
    if (!name || !version) throw new Error(`Unknown CocoaPods acknowledgment: ${name}. Run pod install again.`);
    return { name, version, license, text: requireNotice(text, name, license) };
  });
}

export async function nativeNotices(root: string, notices: Notice[], sources: LicenseSource[], autolinked = new Map<string, string>()): Promise<Notice[]> {
  root = resolve(root);
  const ios = join(root, 'ios');
  const pods = join(ios, 'Pods');
  const lock = await Bun.file(join(ios, 'Podfile.lock')).text();
  if (lock !== await Bun.file(join(pods, 'Manifest.lock')).text()) throw new Error('Run pod install before generating native notices.');
  const { versions, external } = parsePodLock(lock);
  const credited = new Map(notices.map((notice) => [`${notice.name}@${notice.version}`, notice]));
  const reviewedPods = new Map<string, Notice>();
  for (const source of sources) {
    const owner = source.packages.map((id) => credited.get(id)).find(Boolean);
    for (const [name, version] of Object.entries(source.pods ?? {})) {
      if (!versions.has(name)) continue;
      if (versions.get(name) !== version) throw new Error(`Review supplementary notices for ${name} ${versions.get(name)}.`);
      if (!owner) throw new Error(`Missing supplemental license owner for ${name}.`);
      reviewedPods.set(name, owner);
    }
  }
  const files = await Array.fromAsync(new Bun.Glob('Target Support Files/Pods-*/*-acknowledgements.plist').scan(pods));
  if (!files.length) throw new Error('Missing CocoaPods acknowledgments. Run pod install first.');
  const native = await Promise.all(files.sort().map(async (file) => podNotices(await Bun.file(join(pods, file)).text(), versions)));
  const byName = new Map(mergeNotices(native.flat()).map((notice) => [notice.name, notice]));
  const additions: Notice[] = [];
  const owners = new Map<string, Notice>();
  for (const [name] of versions) {
    const location = external[name]?.[':path'];
    if (name === 'PastPinsRecovery' && location && resolve(ios, location) === join(root, 'modules/past-pins-recovery/ios') && notices.some((notice) => notice.name === 'PastPins')) continue;
    let owner: Notice | undefined;
    const podspec = external[name]?.[':podspec'];
    if (podspec) {
      const id = autolinked.get(resolve(ios, podspec));
      owner = id ? credited.get(id) : undefined;
    }
    if (location) {
      let directory = resolve(ios, location);
      while (directory.startsWith(`${root}${sep}`) && directory !== root) {
        if (await Bun.file(join(directory, 'package.json')).exists()) {
          owner = owners.get(directory) ?? await packageNotice(root, directory, sources);
          owners.set(directory, owner);
          break;
        }
        directory = dirname(directory);
      }
    }
    owner ??= reviewedPods.get(name);
    const notice = byName.get(name);
    if (!owner && !notice) throw new Error(`Missing CocoaPods license text for ${name}.`);
    if (owner) additions.push(owner);
    if (notice && !owner?.text.includes(notice.text)) additions.push(notice);
  }
  return mergeNotices([...notices, ...additions]);
}
