# Offline subdivision data

The catalog and country maps are generated from Natural Earth's public-domain
[1:10m Admin 1 – States, Provinces](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/)
dataset. There are no handwritten country-specific lists, polygons, names, or
region-count overrides. The app requires no network access for this feature.

## Source and coverage

`subdivisions-source.json` pins release `v5.1.2`, commit
`f1890d9f152c896d250a77557a5751a93d494776`, and the exact SHA-256 of the upstream
GeoJSON. The packaged dataset version is `5.1.1`; that GeoJSON was last changed
on **2022-05-05**. A recent app generation does not make the underlying geography
current. The source file has 4,596 records; `src/subdivisions/manifest.json`
records the generated counts and all exclusions.

Country joins use the upstream `iso_a2` field and the existing country's ISO
catalog. Metadata filtering omits source records without a supported country,
without a name, with synthetic `adm1_code` identifiers containing `+`, and a
single whole-country record with no subdivision type and `gadm_level: 0`.
This removes undivided territory placeholders and unassigned islands rather
than presenting them as invented administrative regions. A genuine single
region with source administrative metadata is retained; coverage can be partial.

Names use the primary `name` attribute. The English translation, local names,
and alternative names become search aliases. Some upstream translations name a
parent instead of the actual subdivision, so they do not replace the primary
name. Display codes come from syntactically valid `iso_3166_2` values; these are
source labels, not a claim of current ISO certification. Provisional values
containing `~` are omitted. Codes are **not** assumed unique.

Persistent IDs are `ne:<ne_id>`, based on Natural Earth's numeric feature ID.
Names, list positions, and duplicate/changing ISO codes do not control identity.
Backups store these IDs independent of language. A future source upgrade still
requires an identity audit; no third-party identifier guarantees eternal stability.

## Important source limitations

Natural Earth explicitly describes this theme as beta. It is a reputable
cartographic compilation, not an authoritative current government registry.
Administrative levels differ by country: the source includes departments in
France and numerous local authorities in the United Kingdom, not just the
commonly expected first-order regions. It also preserves old arrangements in
some countries: for example, Nepal has older zones and Indonesia has fewer
provinces than today's structure. Some small territories have partial coverage
or none. Distinct source features may share a name or ISO code.

The source applies Natural Earth's
[de facto boundary policy](https://www.naturalearthdata.com/about/disputed-boundaries-policy/).
Its separate subdivision geometries may differ from the app's ISO-viewpoint
world map, including disputed areas and overseas territories. There is no
handwritten geopolitical remapping. The product labels these as available
regions and discloses source age and variable detail.

## Regeneration and verification

```sh
bun run subdivisions:generate
bun run subdivisions:refresh
bun run subdivisions:check
```

`generate` downloads the pinned 40 MB input if its content-addressed temporary
cache is absent. `refresh` forces another download of **the same pinned source**;
it does not silently follow the latest release. Both reject a checksum mismatch
before parsing or writing output. Cache files live in the operating system's
temporary directory, outside the application bundle and repository.

The generated catalog is separate from the maps, so validation, storage, and
search do not load geometry. Map paths are projected before shipping, with a
country-centered longitude cut for antimeridian countries. Initial camera bounds
come from the largest polygon in the existing country map, transformed through
the same projection. This keeps the mainland readable while retaining overseas
regions in the full map. Douglas–Peucker
simplification uses 0.35 units on a 1,000 × 700 canvas and rounding to 0.1 units.
Tiny rings remain present. Selection anchors are checked against the simplified
even-odd fill; invalid source label points are moved to an interior scanline
interval. The maps are illustrative, not survey geometry;
independent ring simplification does not promise topological preservation.

`check` runs entirely offline. It verifies recorded hashes of the source pin,
decoded country geometry, projection-library version, generator code (including
the shared country-geometry helpers), and both generated outputs. It **does not rerun the
generator independently** without the source download. For a full reproducibility
check, save the existing outputs, run `refresh`, and compare their hashes/diff.
Do not edit generated JSON or its manifest to repair a failed check.

## Updating the source

1. Review the upstream release, its boundary policy, license, and known changes.
2. Record the new immutable commit, URL, file checksum, version, and actual
   source-file date in `subdivisions-source.json`.
3. Keep a copy of the current catalog. Regenerate with `--refresh`.
4. Compare old and new `ne_id` sets, country assignments, names, and geometry.
   Investigate every removed or reassigned ID before shipping. The current
   prelaunch app uses a hard cutover; changes that replace saved identities
   require resetting development data. Revisit this policy before supporting
   existing users.
5. Review coverage counts and representative maps, update the attribution and
   source notes, then run tests, lint, typecheck, and offline asset checks.

The current source can be replaced by a newer compatible compilation through
this same pipeline. Combining a modern name list with unmatched old polygons
would create misleading selectable regions and is intentionally avoided.
