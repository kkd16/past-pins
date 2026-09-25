import { compareNames, formatList, t, translations } from '../localization';
import { subdivisionsByCountry } from './catalog';
import type { Subdivision } from './types';

type Kind = keyof typeof translations.en.subdivisionKinds;

function readKind(value: string): Kind | null {
  const key = value.trim().toLowerCase();
  return Object.hasOwn(translations.en.subdivisionKinds, key)
    ? (key as Kind)
    : null;
}

function kindNames(kind: Kind) {
  const plural = t(`subdivisionKinds.${kind}.name`, { count: 2 });
  return {
    singular: t(`subdivisionKinds.${kind}.name`, { count: 1 }),
    countPlural: plural,
    plural,
    title: t(`subdivisionKinds.${kind}.title`),
  };
}

const generic = kindNames('region');

/** Derive collective labels from every source record, retaining minority types. */
export function getSubdivisionTerminology(
  regions: readonly Pick<Subdivision, 'kind'>[],
) {
  const counts = new Map<Kind, number>();
  for (const region of regions) {
    const kind = readKind(region.kind);
    // Missing, ambiguous, and unrecognized types must not be guessed.
    if (!kind) return generic;
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  // Long mixed systems remain "regions"; individual entries retain their type.
  if (!counts.size || counts.size > 2) return generic;
  const kinds = [...counts].sort(
    ([a, aCount], [b, bCount]) => bCount - aCount || compareNames(a, b),
  );
  const first = kindNames(kinds[0][0]);
  if (kinds.length === 1) return first;
  const second = kindNames(kinds[1][0]);
  return {
    // A selection can contain either type, so its counts still use "regions".
    ...generic,
    plural: formatList([first.plural, second.plural]),
    title: formatList([first.title, second.plural]),
  };
}

const countryTerminology = new Map(
  [...subdivisionsByCountry].map(([id, regions]) => [
    id,
    getSubdivisionTerminology(regions),
  ]),
);

/** Omitting the country supplies the collective wording for global screens. */
export function getCountrySubdivisionTerminology(countryId?: string) {
  return countryTerminology.get(countryId ?? '') ?? generic;
}

export function getSubdivisionKindLabel(kind: string) {
  return t(`subdivisionKinds.${readKind(kind) ?? 'region'}.name`, { count: 1 });
}
