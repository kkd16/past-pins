import { expect, test } from 'bun:test';
import { join } from 'node:path';

import location from '../src/localization/locales/en/location.json';

test('native release configuration preserves iPhone scope and required privacy declarations', async () => {
  const root = join(import.meta.dir, '..');
  const child = Bun.spawn([
    'node', join(root, 'node_modules/expo/bin/cli'), 'config', '--type', 'introspect', '--json',
  ], { cwd: root, stdout: 'pipe', stderr: 'pipe' });
  const [output, errors, exit] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(errors).toBe('');
  expect(exit).toBe(0);
  const config = JSON.parse(output);
  const info = config._internal.modResults.ios.infoPlist;

  expect(config.platforms).toEqual(['ios']);
  expect(config.ios.supportsTablet).toBe(false);
  expect(info.CFBundleLocalizations).toEqual(['en']);
  expect(info.ITSAppUsesNonExemptEncryption).toBe(false);
  expect(info.UIBackgroundModes).toContain('location');
  expect(info.UIBackgroundModes).toContain('fetch');
  expect(config.ios.privacyManifests.NSPrivacyAccessedAPITypes).toContainEqual({
    NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
    NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
  });
  expect(info.NSLocationWhenInUseUsageDescription).toBe(location.permissionMessage);
  expect(info.NSLocationAlwaysAndWhenInUseUsageDescription).toBe(location.alwaysPermissionMessage);
  expect(info.NSMotionUsageDescription).toBe(location.motionPermissionMessage);
}, 30000);
