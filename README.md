# PastPins

An offline travel atlas for iPhone and iPad, with one dark green theme. It opens on the center Map tab; Countries and Stats connect the same collection of places.

## Develop

```sh
bun install --frozen-lockfile
bun run ios
# On Linux, use bun run dev and open the tunnel in Expo Go on an iPhone or iPad.
```

The app targets Expo SDK 57 and uses its bundled native modules. Use the Bun version in `package.json` and Node.js 22.13 or newer. `bun run typecheck` refreshes Expo Router's generated types before checking the app, scripts, and tests, including on a fresh checkout. Rebuild an existing development client after changing native dependencies.

`bun run` lists the available commands. The Makefile is a short set of aliases for the same Bun scripts.

| Command | Purpose |
| --- | --- |
| `bun run check` | Lint all code, typecheck, run tests, and check generated assets |
| `bun run check:all` | Also run Expo Doctor and export the production iOS bundle |
| `bun test --watch` | Rerun tests as files change |
| `bun test backup` | Run tests whose filenames match a pattern |
| `bun run test:coverage` | Inspect coverage of the code loaded by tests |
| `bun run lint --fix` | Apply ESLint's available fixes |
| `bun run start --clear` | Start Expo with its built-in Metro cache reset |
| `bun run generate` | Regenerate globe geometry and license notices |
| `bun run deps:update` | Update compatible dependencies, align Expo versions, regenerate assets, and run all checks |
| `bun run reset` | Reinstall locked dependencies and clear this project's Expo state |

Reset leaves other projects' Metro caches and Watchman watches alone. The `react-native-screens` override matches the native version included in Expo Go; align it when changing SDKs. Install app dependencies with `bunx expo install`, then run `bun run generate` to refresh affected bundled assets.

## Product flows

- **Map:** switch between the native GL globe and an Equal Earth world map. Each keeps its own camera during the session. Drag, pinch, and—with the globe—twist two fingers. Search or Go home focuses a country; North up straightens the globe; Fit world restores the flat overview.
- **Country selection:** tap a place for a small anchored name/status callout, then tap the callout for details. Closing details preserves selection and camera. Tap ocean to dismiss selection. Labels are sparse and automatically placed.
- **Countries:** search, group by continent or alphabetically, and choose All, Visited, Wishlist, Lived, or Not visited. Continent filters use Cancel/Apply. Select mode updates multiple results together; changing the search or result set clears selection.
- **Details:** edit status and current home, read available capital/language/currency facts, or Show on map. Changes save immediately. There are no dates, notes, or timelines.
- **Stats:** visited, wishlist, lived, remaining, and continent summaries open matching country lists. Percentages count catalog places rather than land area. The gear opens Settings.
- **Settings:** choose map preferences, home, list organization, and haptics. Export or restore a backup, clear travel data, and reset preferences. About includes app and data versions, project/profile links, and map credits; license notices are available offline.

A place is unmarked, Wishlist, Visited, or Lived. Lived always counts as Visited; Not visited includes Wishlist. Setting current home marks that country Lived. Moving or clearing home keeps former homes in Lived. Bulk Mark visited preserves existing Lived status; a single-country status menu or details can explicitly downgrade it. Changing the current home’s status away from Lived asks to clear home too.

Undo restores the last individual, bulk, or home edit without reverting preferences. Another travel edit replaces it. Restore and reset actions clear Undo.

## Architecture and data

- `src/app/`: thin Expo Router routes, native tabs, and one native stack for detail sheets and Settings.
- `src/screens/`: page composition and connected navigation flows. Query, scope, and continent live in route parameters; grouping is a persisted preference.
- `src/countries/`: authoritative catalog joins, country facts, pure search/filter/statistics functions, and country controls.
- `src/data/`: the app snapshot, pure status/home transitions, current-format backup validation, and one shared store/provider with Undo.
- `src/storage/`: serialized snapshot persistence through Expo SQLite key-value storage.
- `src/atlas/`: map toolbar and summary, shared selection, colors, label/callout placement, and the flat camera/renderer. `src/globe/` owns spherical camera math, GPU geometry, picking, gestures, and rendering. Only the active view mounts.
- `src/settings/`: small settings layouts and native backup file operations. `src/components/` and `src/theme.ts` centralize reusable controls, typography, spacing, surfaces, state colors, and appearance. `AppPressable` supplies touch targets and interaction feedback while forwarding native props; `ChoiceSection` and `ToggleRow` keep radio groups and native switches consistent across screens.
- `src/localization/`: JSON resources grouped by language code, typed lookups, iOS locale selection, and shared number/list formatting. Domain catalogs keep copy beside its owning feature without spreading strings through UI code.
- `scripts/`: deterministic geography and license generation; these tools are not bundled into the app.

One `AppDataProvider` owns statuses, current home, and preferences. Rows receive data and callbacks; derived filters and totals remain ordinary functions. Persistence writes one complete JSON snapshot under `app-data` in `past-pins-app.db`. Writes are ordered and atomic at the key-value boundary. Edits publish immediately; failed writes offer Retry save. Initial loading gates editing.

The store is new and app-owned. There are no migrations or legacy readers. Backups contain the full persistent snapshot and accept only the current format. Import validates before offering a count preview, then replaces the stored snapshot before publishing it. A failed restore preserves current state. Clearing travel data keeps preferences; resetting preferences keeps places and home.

Map mode, labels, summary, haptics, and list organization persist across launches. Cameras, selections, search/filter state, and Undo are session-only. No accounts, location permission, remote tiles, or cloud sync are required. Expo Go still needs Metro to load a fresh development bundle.

## Geography and notices

`@rembish/iso-topojson/iso-a2.json` supplies names and polygons; `countries-list` supplies primary continents and available country facts. The catalog includes countries, territories, Antarctica, and Kosovo. It is not a count of sovereign states. Geography is bundled and contains no hand-maintained country coordinates or overrides.

`bun run globe:generate` derives globe triangles and country anchors from the installed source, including tiny-place markers. GL renders cached geometry; the flat view uses SVG paths from D3’s Equal Earth projection. Label candidates and focus anchors come from source polygons, with the main landmass used for country focus. Rendering stops while hidden or backgrounded; animation respects Reduce Motion.

Map data © Alex Rembish, [iso-topojson](https://github.com/rembish/iso-topojson), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), based on [Natural Earth](https://www.naturalearthdata.com/) public-domain data. PastPins transforms geometry, projection, labeling, and styling. Country facts come from [Countries by Annexare](https://github.com/annexare/Countries).

`bun run licenses:generate` rebuilds bundled third-party notices from installed package metadata and license files. Settings contains map credits and searchable offline notices.

## Validation

Localization uses [`expo-localization`](https://docs.expo.dev/versions/v57.0.0/sdk/localization/) and [`i18n-js`](https://github.com/fnando/i18n), with English currently shipped and used as fallback. JSON resources live in `src/localization/locales/en/`; a thin TypeScript layer supplies typed keys and native number formatting. The library handles locale fallback, interpolation, plurals, and lists. Country facts use bundled English source names and currency codes. To add a language, supply complete messages, the library’s base formatting translations and plural rules, geographic name data supported by Hermes, and matching native supported locales. Stored IDs and original legal notices stay unchanged. Lint rejects raw JSX text and literal text labels.

Accessibility uses native iOS controls, scalable text, semantic control states, logical spacing, and 44-point targets. VoiceOver and large text get a stable selected-country card; map accessibility actions provide zoom and pan without multi-finger gestures. Reduce Motion disables camera/check animations. Keep manual device checks below part of each platform upgrade.

```sh
bun run check
bun run check:all  # includes network-based Expo diagnostics and the iOS export
```

GitHub Actions runs the same checks on pull requests, pushes to `main`, and manual runs, with coverage shown in the test log. It uses current stable action releases, the latest stable Node.js, and the project's Bun version. The workflow has read-only repository access and cancels superseded runs. It does not sign, submit, deploy, or publish the app.

Tests cover locale fallback, interpolation/plurals, regional formatting, native/source-name search, map accessibility actions, travel/home invariants, bulk changes, Undo, persistence ordering and failure recovery, atomic restore, backup validation, catalog filtering/counts, geometry, cameras, picking, annotations, frame lifecycle, and theme contrast. Use explicit examples or independent invariants for expected results; avoid checking a function against itself or coupling tests to object identity without a behavioral reason. Coverage is diagnostic, with no percentage gate: it measures loaded JavaScript/TypeScript, not native screens, gestures, or device performance. The test preload only supplies iOS locale information; controller tests use a small manual frame clock rather than elapsed-time sleeps.

Before shipping, verify on physical iPhone and iPad:

- Globe/world-map switching preserves each camera. Drag, focal pinch, twist, north-up, search focus, and fit controls work across zoom limits, poles, and the antimeridian. Idle/background views stop rendering.
- Callouts remain readable inside safe areas, follow selection, hide behind the globe or outside the viewport, and return after details. Small islands, polygon holes, and overseas territories remain selectable.
- Country edits, bulk actions, home changes, Undo, Stats drilldowns, filter cancellation, and Show on map agree across tabs and survive relaunch where appropriate.
- Backup export/import cancellation, invalid files, failed saves, and failed restores recover without partial data. Retry remains available and storage errors are announced once when they appear.
- Native tabs, sheets, search keyboards, and Settings remain usable on short/resizable iPad windows, at the largest Dynamic Type sizes, with VoiceOver and Reduce Motion enabled.
- After loading the bundle, all geography, facts, editing, and license notices work offline. Check smooth native rendering on-device; passing JavaScript tests or an export does not establish iOS visual quality or frame rate.
