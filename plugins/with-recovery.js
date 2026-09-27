const fs = require('node:fs/promises');
const path = require('node:path');
const { withXcodeProject, IOSConfig } = require('expo/config-plugins');

async function writeRecoveryResources(projectRoot, destination) {
  const ownedFiles = JSON.parse(await fs.readFile(path.join(projectRoot, 'src/storage/owned-files.json'), 'utf8'));
  const bundle = path.join(destination, 'Settings.bundle');
  await fs.mkdir(bundle, { recursive: true });
  await fs.writeFile(path.join(bundle, 'Root.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>StringsTable</key><string>Root</string>
<key>PreferenceSpecifiers</key><array>
<dict><key>Type</key><string>PSGroupSpecifier</string>
<key>Title</key><string>nativeResetGroup</string>
<key>FooterText</key><string>nativeResetWarning</string></dict>
<dict><key>Type</key><string>PSToggleSwitchSpecifier</string>
<key>Title</key><string>nativeResetTitle</string>
<key>Key</key><string>${ownedFiles.resetPreference}</string>
<key>DefaultValue</key><false/></dict>
</array></dict></plist>
`);
  const locales = path.join(projectRoot, 'src/localization/locales');
  for (const language of await fs.readdir(locales)) {
    const messages = JSON.parse(await fs.readFile(path.join(locales, language, 'recovery.json'), 'utf8'));
    const localized = path.join(bundle, `${language}.lproj`);
    await fs.mkdir(localized, { recursive: true });
    const content = ['nativeResetGroup', 'nativeResetWarning', 'nativeResetTitle'].map((key) => {
      if (typeof messages[key] !== 'string') throw new Error(`Missing recovery localization: ${language}/${key}`);
      return `${JSON.stringify(key)} = ${JSON.stringify(messages[key])};`;
    }).join('\n');
    await fs.writeFile(path.join(localized, 'Root.strings'), `${content}\n`);
  }
  await fs.writeFile(path.join(destination, 'PastPinsRecoveryFiles.json'), JSON.stringify(ownedFiles));
}

module.exports = function withRecovery(config) {
  config.ios ??= {};
  config.ios.privacyManifests ??= {};
  const manifest = config.ios.privacyManifests;
  manifest.NSPrivacyAccessedAPITypes ??= [];
  let defaults = manifest.NSPrivacyAccessedAPITypes.find((entry) => entry.NSPrivacyAccessedAPIType === 'NSPrivacyAccessedAPICategoryUserDefaults');
  if (!defaults) {
    defaults = { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: [] };
    manifest.NSPrivacyAccessedAPITypes.push(defaults);
  }
  if (!defaults.NSPrivacyAccessedAPITypeReasons.includes('CA92.1')) defaults.NSPrivacyAccessedAPITypeReasons.push('CA92.1');
  return withXcodeProject(config, async (mod) => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(mod.modRequest.projectRoot);
    await writeRecoveryResources(mod.modRequest.projectRoot, path.join(mod.modRequest.platformProjectRoot, projectName));
    for (const resource of ['Settings.bundle', 'PastPinsRecoveryFiles.json']) {
      IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath: `${projectName}/${resource}`,
        groupName: projectName,
        isBuildFile: true,
        project: mod.modResults,
      });
    }
    return mod;
  });
};
module.exports.writeRecoveryResources = writeRecoveryResources;
