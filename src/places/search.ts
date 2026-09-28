import Fuse from 'fuse.js';

export function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/(\p{Script=Latin})\p{M}+/gu, '$1').toLowerCase().normalize('NFC').trim();
}

export function searchWords(value: string) {
  return normalizeSearch(value).match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu) ?? [];
}

export function searchName(value: string) {
  return searchWords(value).join(' ');
}

export function searchEntry<T>(item: T, name: string, aliases: readonly string[] = [], context: readonly string[] = []) {
  const words = searchWords(name);
  return {
    item,
    normalizedName: words.join(' '),
    words,
    aliasWords: aliases.flatMap(searchWords),
    contextWords: context.flatMap(searchWords),
  };
}

export type SearchEntry<T> = ReturnType<typeof searchEntry<T>>;

export function isShortCode(word: string) {
  return /^[a-z]{1,2}$/u.test(word);
}

function matchRank<T>(entry: SearchEntry<T>, words: readonly string[], name: string): number | undefined {
  if (entry.normalizedName === name) return 0;
  const matches = words.map((word) => {
    const secondary = (candidates: readonly string[]) => candidates.some((candidate) =>
      isShortCode(word) ? candidate === word : candidate.startsWith(word),
    );
    return {
      name: entry.words.some((candidate) => candidate.startsWith(word)),
      alias: secondary(entry.aliasWords),
      context: secondary(entry.contextWords),
    };
  });
  if (matches.some(({ name }) => name) && matches.every(({ name, context }) => name || context)) return 1;
  if (matches.every(({ name, alias }) => name || alias)) return 2;
  if (matches.every(({ name, alias, context }) => name || alias || context)) return 3;
}

export function rankEntries<T>(entries: readonly SearchEntry<T>[], query: string) {
  const words = searchWords(query);
  if (!words.length) return query.trim() ? [] : entries.map(({ item }) => ({ item, rank: 0 }));
  const name = words.join(' ');
  return entries.flatMap((entry) => {
    const rank = matchRank(entry, words, name);
    return rank === undefined ? [] : [{ item: entry.item, rank }];
  }).sort((a, b) => a.rank - b.rank);
}

export function suggestEntries<T>(entries: readonly SearchEntry<T>[], query: string): T[] {
  const words = searchWords(query);
  if (words.join('').length < 4) return [];
  const fuse = new Fuse(entries, {
    keys: ['normalizedName'],
    threshold: 0.3,
    ignoreLocation: true,
  });
  return fuse.search(words.join(' '), { limit: 3 }).map(({ item }) => item.item);
}
