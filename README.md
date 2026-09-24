# PastPins

A dark-only, iOS-only Expo app for checking off places and seeing them on a world map.

## Develop

```sh
bun install
bunx expo start --ios
# On a Linux host, use make dev and open the tunnel on an iPhone or iPad.
bun test
bunx expo lint
bunx tsc --noEmit
bunx expo-doctor
```

The native dependencies used here are included in Expo Go for SDK 57. A development build is needed if future dependencies introduce native modules that Expo Go does not include.

## Where changes belong

- `src/theme.ts`: shared colors, typography, spacing, and motion.
- `src/components/`: shared controls and screen layout. Scrollable children own their bottom safe-area inset.
- `src/hooks/`: visits state and keyboard visibility.
- `src/screens/`: full screens that compose components and hooks.
- `src/countries/`: the map, checklist, catalog/search, and storage interface.
- `src/storage/`: storage implementations; `visits.ts` selects the app's backend.
- `src/app/`: Expo Router entry points and dependency wiring.

Prefer existing controls and native props. Keep country-specific code together; extract shared pieces when they have a clear use. There is no light theme or theme provider.

## Map and checklist data

Both use `@svg-maps/world` directly. The package's 256 named shapes define this first version's collection; this is a map dataset, not an official count of sovereign countries. Names and IDs stay as supplied upstream. The checklist is A–Z with name/code search, and the displayed total is derived from the data.

There is no catalog join, custom geographic override, generated map pipeline, or runtime network request. Very small places can be selected through the list or by zooming the map. The dataset omits Antarctica and includes some islands as separate places. Country-name aliases, flags, and continent grouping are deferred to keep this iteration small.

To update data, use `bunx expo install @svg-maps/world --bun` and review the upstream changes. Persisted IDs must remain compatible; changes to IDs need an explicit migration before shipping. Unexpected saved IDs produce an error instead of being silently removed.

## Saved visits

Visits are stored locally in `past-pins.db` using [Expo SQLite for SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/). The `visited_countries` table has one `country_id` primary key per visited place. The connection opens asynchronously on first use, enables WAL, and creates the table if needed.

Reads finish before editing is enabled. Reads and snapshot writes are serialized so rapid toggles persist in order. Each save replaces the selection in a transaction; failure preserves the last committed selection. Load and save failures offer retry, and unknown country IDs are rejected without silently changing saved data.

This is a hard cutover: previous AsyncStorage data is ignored. There is no JSON parser, migration, fallback backend, or reset flow.

[VisitStorage](src/countries/visit-storage.ts) exposes `load` and `save`; `src/storage/visits.ts` creates the app's stable adapter, which the route injects into the screen. Tests execute the adapter's SQL against temporary databases using Bun's SQLite support. Native behavior still needs an iPhone/iPad smoke test. Expo SQLite is included in SDK 57 Expo Go; rebuild an existing development client after adding it.

## Attribution

The map is based on [MapSVG's world map](https://mapsvg.com/maps/world), adapted and packaged by [Victor Cazanave / svg-maps](https://github.com/VictorCazanave/svg-maps). It is licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). PastPins applies its own colors and visited/selection states; the supplied paths are unchanged. See `licenses/svg-maps-CC-BY-4.0.md` for the license.
