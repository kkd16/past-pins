import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createLocalization } from '../src/localization/core';
import messages from '../src/localization/locales/en/website.json';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = join(root, '_site');
const pages = ['index.html', 'privacy/index.html', 'support/index.html'];
const { t } = createLocalization({ en: messages }, 'en');
type MessageKey = Parameters<typeof t>[0];

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function translateHtml(html: string) {
  return html.replace(
    /\{\{(\w+)\.(\w+)\}\}/g,
    (_placeholder, section: string, key: string) => {
      if (
        !Object.hasOwn(messages, section) ||
        !Object.hasOwn(messages[section as keyof typeof messages], key)
      ) {
        throw new Error(`Unknown website message: ${section}.${key}`);
      }
      return escapeHtml(t(`${section}.${key}` as MessageKey));
    },
  );
}

await rm(output, { recursive: true, force: true });

for (const page of pages) {
  const template = await Bun.file(join(root, 'website', page)).text();
  const destination = join(output, page);
  await mkdir(dirname(destination), { recursive: true });
  await Bun.write(destination, translateHtml(template));
}

await Bun.write(
  join(output, 'styles.css'),
  Bun.file(join(root, 'website/styles.css')),
);
console.log('Built Home, Privacy, and Support in _site/.');
