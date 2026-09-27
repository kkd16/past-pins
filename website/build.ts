import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createLocalization } from '../src/localization/core';
import messages from '../src/localization/locales/en/website.json';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = join(root, '_site');
const base = '/past-pins/';
const origin = 'https://kkd16.github.io';
const source = 'https://github.com/kkd16/past-pins';
const { t } = createLocalization({ en: messages }, 'en');
type Key = Parameters<typeof t>[0];
type Page = 'home' | 'privacy' | 'support';

function escape(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}
const text = (key: Key) => escape(t(key));
const link = (href: string, label: Key) => `<a href="${escape(href)}">${text(label)}</a>`;
const paragraph = (key: Key) => `<p>${text(key)}</p>`;
const list = (...keys: Key[]) => `<ul>${keys.map((key) => `<li>${text(key)}</li>`).join('\n')}</ul>`;
const section = (heading: Key, ...body: Key[]) =>
  `<section><h2>${text(heading)}</h2>${body.map(paragraph).join('\n')}</section>`;
const email = () => link(`mailto:${t('shared.contact')}`, 'shared.contact');
const pagePath = (page: Page) => page === 'home' ? base : `${base}${page}/`;

function layout(page: Page, content: string) {
  const navigation = (['home', 'privacy', 'support'] as const).map((item) =>
    `<a href="${pagePath(item)}"${item === page ? ' aria-current="page"' : ''}>${text(`shared.${item}`)}</a>`,
  ).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <title>${text(`${page}.title`)}</title>
  <meta name="description" content="${text(`${page}.description`)}">
  <link rel="canonical" href="${origin}${pagePath(page)}">
  <link rel="stylesheet" href="${base}styles.css">
</head>
<body>
  <a class="skip" href="#main">${text('shared.skip')}</a>
  <header class="site-header">
    <a class="brand" href="${base}">${text('shared.name')}</a>
    <nav aria-label="${text('shared.navigation')}">${navigation}</nav>
  </header>
  <main id="main" tabindex="-1" class="${page}">${content}</main>
  <footer>
    <p>${text('shared.copyright')}</p>
    <div class="footer-links">
      ${link(source, 'shared.source')}
      ${link(`${source}/blob/main/LICENSE`, 'shared.license')}
      ${link(`${source}/blob/main/COPYING.iOS`, 'shared.exception')}
    </div>
  </footer>
</body>
</html>
`;
}

const pages: Record<Page, string> = {
  home: `
    <div class="hero">
      <p class="eyebrow">${text('home.eyebrow')}</p>
      <h1>${text('home.heading')}</h1>
      <p class="intro">${text('home.intro')}</p>
      <p class="status">${text('home.status')}</p>
    </div>
    <section class="features">
      <h2>${text('home.featuresTitle')}</h2>
      <dl>
        <div><dt>${text('home.mapTitle')}</dt><dd>${text('home.mapText')}</dd></div>
        <div><dt>${text('home.offlineTitle')}</dt><dd>${text('home.offlineText')}</dd></div>
        <div><dt>${text('home.choiceTitle')}</dt><dd>${text('home.choiceText')}</dd></div>
      </dl>
    </section>
    ${section('home.aboutTitle', 'home.aboutText')}
    <div class="actions">
      ${link(`${base}support/`, 'home.supportLink')}
      ${link(`${base}privacy/`, 'home.privacyLink')}
    </div>
    <p class="muted">${text('home.licenseText')}</p>`,
  privacy: `
    <h1>${text('privacy.heading')}</h1>
    <p class="eyebrow">${text('privacy.updated')}</p>
    <p class="intro">${text('privacy.intro')}</p>
    <section><h2>${text('privacy.localTitle')}</h2>
      ${list('privacy.localText', 'privacy.recoveryText', 'privacy.diagnosticsText')}
    </section>
    ${section('privacy.locationTitle', 'privacy.locationText', 'privacy.remindersText', 'privacy.reminderStorageText', 'privacy.permissionsText')}
    <p>${link('https://www.apple.com/legal/privacy/', 'privacy.appleLink')}</p>
    ${section('privacy.sharingTitle', 'privacy.sharingText', 'privacy.backupsText')}
    ${section('privacy.contactTitle', 'privacy.contactText', 'privacy.rightsText', 'privacy.localRightsText')}
    <section><h2>${text('privacy.retentionTitle')}</h2>
      ${paragraph('privacy.retentionText')}
      ${list('privacy.clearText', 'privacy.resetText', 'privacy.preferencesText')}
      ${paragraph('privacy.deletionText')}
    </section>
    ${section('privacy.websiteTitle', 'privacy.websiteText', 'privacy.providersText')}
    <ul>
      <li>${link('https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection', 'privacy.githubLink')}</li>
      <li>${link('https://privacy.microsoft.com/en-us/privacystatement', 'privacy.microsoftLink')}</li>
    </ul>
    ${section('privacy.childrenTitle', 'privacy.childrenText')}
    ${section('privacy.changesTitle', 'privacy.changesText')}
    <p class="contact">${email()}</p>`,
  support: `
    <h1>${text('support.heading')}</h1>
    <p class="intro">${text('support.intro')}</p>
    <p class="contact">${email()}</p>
    ${paragraph('support.emailHelp')}
    ${section('support.availabilityTitle', 'support.availabilityText')}
    ${section('support.backupTitle', 'support.backupText')}
    ${section('support.recoveryTitle', 'support.recoveryText')}
    ${section('support.resetTitle', 'support.resetText', 'support.coldResetText')}
    ${section('support.remindersTitle', 'support.remindersText', 'support.reminderTimingText')}
    ${section('support.mapsTitle', 'support.mapsText')}
    <div class="actions">
      ${link(`${base}privacy/`, 'support.privacyLink')}
      ${link(source, 'support.sourceLink')}
    </div>`,
};

// Publish only this directory, never the repository or Expo's dist output.
await rm(output, { recursive: true, force: true });
for (const page of Object.keys(pages) as Page[]) {
  const directory = page === 'home' ? output : join(output, page);
  await mkdir(directory, { recursive: true });
  await Bun.write(join(directory, 'index.html'), layout(page, pages[page]));
}
await Bun.write(join(output, 'styles.css'), Bun.file(join(root, 'website/styles.css')));
await Bun.write(join(output, '.nojekyll'), '');
console.log(`Built three static pages in ${output}.`);
