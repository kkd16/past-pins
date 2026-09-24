# PastPins

An offline, dark-only iOS travel atlas for iPhone and iPad. It opens on the map, with Countries on the left and Stats on the right.

## Develop

```sh
bun install
bunx expo start --ios
# On a Linux host, use make dev and open the tunnel on an iPhone or iPad.
bun test
bunx expo lint
bunx tsc --noEmit
bunx expo-doctor
bunx expo export --platform ios
```

Expo generates typed routes when the development server starts. Start it once after adding routes before running TypeScript. Native modules used here are included in SDK 57 Expo Go. Rebuild an existing development client after adding native dependencies.

## App structure

- `src/app/`: thin Expo Router routes, native tabs, and native form sheets. The map is the index route and default tab.
- `src/screens/`: screen composition and interactions. Countries keeps its search and visit-status selection while mounted; continent and grouping choices travel through Router parameters.
- `src/countries/`: the app-owned catalog and types, pure search/filter/statistics functions, country UI, and the shared visits provider.
- `src/components/`: reusable controls and layouts. `Screen` applies native safe-area insets, including the tab bar. Its scrollable children use no automatic insets. Sheets scroll their full contents for large text.
- `src/hooks/`: the visits lifecycle and persistence hook.
- `src/storage/`: the SQLite adapter and application storage wiring.
- `src/theme.ts`: shared colors, typography, spacing, and sizing.

The root mounts one `VisitsProvider` with an injected `VisitStorage`. All tabs and sheets consume that same state. Presentational country rows receive data and callbacks; filtering and statistics are ordinary functions with no UI or storage dependencies. Screens never import upstream geographic data directly.

## Map and catalog

`catalog.ts` joins polygon data from `@rembish/iso-topojson/iso-a2.json` to `countries-list` continent metadata by ISO alpha-2 code. The current map contains 250 places, including countries, dependent territories, Antarctica, and Kosovo. This is the map's catalog, not a count of sovereign states. Names and boundaries follow the map package; primary continent assignments follow the metadata package.

There are no place-specific overrides, manually maintained geographic tables, runtime downloads, or generated map files. `topojson-client` converts topology to features and `d3-geo` projects them to SVG paths once when the catalog loads. React Native SVG draws those paths, and an iOS ScrollView provides pan and zoom. Small places can also be selected through Countries.

The map, list, filters, and statistics all use the resulting catalog. Missing metadata, duplicate IDs, and invalid paths are errors, not silent omissions. Update dependencies with `bunx expo install`, then run the catalog and filtering tests to check coverage.

## Visits

Visits are binary and stored locally in `past-pins-visits.db`. The `visited_countries` table contains a primary-key `country_id` for each visited place. This implementation uses its own database directly; there are no migrations or legacy storage readers.

Reads finish before editing is enabled. Writes are serialized and transactional; each saves a snapshot. Edits appear immediately across the app, while failures display retry controls. Statistics remain unavailable until saved visits have loaded.

Country details save immediately. List filters apply with Done; swiping their sheet away discards the draft. Search, filters, and map zoom survive tab switches but are not persisted across a fresh launch.

## Validation

Bun tests cover catalog joins, search, combined filtering, grouping, statistics, and SQLite ordering/rollback/retry behavior. Before shipping, check on iPhone and iPad:

- Cold launch selects the center Map tab; tab switches preserve map zoom and list state.
- Selecting a map shape or country name opens the same detail sheet; both its switch and list checkmarks update every tab and persist after relaunch.
- Filters intersect with search and visit status; Done applies and swipe dismissal cancels.
- Insets, native tabs, sheet expansion, keyboards, and text remain usable at large Dynamic Type sizes, with VoiceOver and Reduce Motion enabled.
- All map data and visit editing work offline.

## Attribution

Map data © 2026 Alex Rembish, [iso-topojson](https://github.com/rembish/iso-topojson), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), based on [Natural Earth](https://www.naturalearthdata.com/) public-domain data. PastPins projects the supplied geometry and changes its styling and visit/selection colors.

Continent metadata comes from [Countries by Annexare](https://github.com/annexare/Countries), MIT licensed. License notices are retained in `licenses/`; attribution is also accessible in Stats.
