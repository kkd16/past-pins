import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

export type Notice = { name: string; version: string; license: string; text: string };
export type LicenseSource = { packages: string[]; file: string; url: string; attribution?: string; includes?: string[]; pods?: Record<string, string> };

export function requireNotice(text: string, name: string, license = ''): string {
  const normalized = text.replaceAll('\r\n', '\n').trim();
  if (!/\s/.test(normalized) || normalized === license || normalized.startsWith('The installed package declares'))
    throw new Error(`Missing license text for ${name}.`);
  return normalized;
}

export async function readNotice(path: string, name = path, license = ''): Promise<string> {
  return requireNotice(await Bun.file(path).text(), name, license);
}

async function licenseFiles(directory: string): Promise<string[]> {
  const files = await Promise.all((await readdir(directory, { withFileTypes: true })).map(async (entry) => {
    if (entry.name === 'node_modules' || entry.name === '.git') return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return licenseFiles(path);
    return entry.isFile() && /(?:^|[-_. ]|third[-_ ]?party[-_ ]?)(licen[cs]es?|copying|notices?)(?:text)?(?:[-_. ]|$)/i.test(entry.name) ? [path] : [];
  }));
  return files.flat().sort();
}

export async function packageNotice(root: string, directory: string, sources: LicenseSource[]): Promise<Notice> {
  const pkg = await Bun.file(join(directory, 'package.json')).json();
  const id = `${pkg.name}@${pkg.version}`;
  if (typeof pkg.license !== 'string' || !pkg.license.trim()) throw new Error(`Missing declared license for ${id}.`);
  const files = await licenseFiles(directory);
  const parts: string[] = [];
  const included = new Set<string>();
  for (const file of files) {
    const text = await readNotice(file, id, pkg.license);
    if (!included.has(text)) parts.push(`${relative(directory, file)}\n\n${text}`);
    included.add(text);
  }
  const supplemental = sources.filter((source) => source.packages.some((entry) => entry.startsWith(`${pkg.name}@`)));
  if (supplemental.some((source) => !source.packages.includes(id))) {
    throw new Error(`Review supplementary notices for ${id} in licenses/sources.json.`);
  }
  for (const source of supplemental) {
    const text = await readNotice(join(root, source.file), id, pkg.license);
    const duplicate = included.has(text);
    if (!duplicate || source.attribution || source.includes?.length) {
      parts.push([
        `${source.file}\nSource: ${source.url}`,
        source.attribution,
        source.includes?.length ? `Includes native bindings:\n${source.includes.join('\n')}` : undefined,
        duplicate ? undefined : text,
      ].filter(Boolean).join('\n\n'));
    }
    included.add(text);
  }
  if (!parts.length) throw new Error(`Missing license text for ${id}. Add a reviewed notice to licenses/sources.json.`);
  return { name: pkg.name, version: pkg.version, license: pkg.license, text: parts.join('\n\n---\n\n') };
}

export function mergeNotices(notices: Notice[]): Notice[] {
  const merged = new Map<string, Notice>();
  for (const notice of notices) {
    const text = requireNotice(notice.text, notice.name, notice.license);
    const id = `${notice.name}@${notice.version}`;
    const existing = merged.get(id);
    if (!existing) merged.set(id, { ...notice, text });
    else if (text.includes(existing.text)) existing.text = text;
    else if (!existing.text.includes(text)) existing.text += `\n\n---\n\n${text}`;
  }
  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name, 'en') || a.version.localeCompare(b.version, 'en'));
}
