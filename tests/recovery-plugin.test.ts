import { expect, test } from 'bun:test';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import plist from '@expo/plist';

import withRecovery, { writeRecoveryResources } from '../plugins/with-recovery';
import ownedFiles from '../src/storage/owned-files.json';
import messages from '../src/localization/locales/en/recovery.json';
import type { ExpoConfig } from 'expo/config';

const projectRoot = join(import.meta.dir, '..');

test('Settings resources are valid, localized, opt-in, and match native file ownership', async () => {
  const destination = await mkdtemp(join(tmpdir(), 'past-pins-settings-'));
  try {
    await writeRecoveryResources(projectRoot, destination);
    const bundle = join(destination, 'Settings.bundle');
    const source = await readFile(join(bundle, 'Root.plist'), 'utf8');
    const root = plist.parse(source) as { StringsTable: string; PreferenceSpecifiers: Record<string, unknown>[] };
    expect(root.StringsTable).toBe('Root');
    expect(root.PreferenceSpecifiers).toEqual([
      { Type: 'PSGroupSpecifier', Title: 'nativeResetGroup', FooterText: 'nativeResetWarning' },
      { Type: 'PSToggleSwitchSpecifier', Title: 'nativeResetTitle', Key: ownedFiles.resetPreference, DefaultValue: false },
    ]);
    const locales = await readdir(join(projectRoot, 'src/localization/locales'));
    for (const locale of locales) {
      const strings = await readFile(join(bundle, `${locale}.lproj/Root.strings`), 'utf8');
      expect(strings).toContain('"nativeResetWarning" = ');
      expect(strings).toContain('"nativeResetTitle" = ');
    }
    expect(await readFile(join(bundle, 'en.lproj/Root.strings'), 'utf8')).toContain(JSON.stringify(messages.nativeResetWarning));
    expect(JSON.parse(await readFile(join(destination, 'PastPinsRecoveryFiles.json'), 'utf8'))).toEqual(ownedFiles);
    await writeRecoveryResources(projectRoot, destination);
    expect(await readFile(join(bundle, 'Root.plist'), 'utf8')).toBe(source);
  } finally { await rm(destination, { recursive: true, force: true }); }
});

test('plugin merges the UserDefaults privacy reason without duplicates', () => {
  const config: ExpoConfig = { name: 'PastPins', slug: 'past-pins', ios: { supportsTablet: false, privacyManifests: { NSPrivacyAccessedAPITypes: [
    { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['1C8F.1'] },
  ] } } };
  const result = withRecovery(withRecovery(config));
  expect(result.ios?.supportsTablet).toBe(false);
  expect(result.ios?.privacyManifests?.NSPrivacyAccessedAPITypes).toEqual([
    { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['1C8F.1', 'CA92.1'] },
  ]);
});
