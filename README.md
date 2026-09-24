# PastPins

An offline travel atlas for iPhone and iPad, with one dark green theme. It opens on the center Map tab; Countries and Stats connect the same collection of places.

## Develop

```sh
bun install
bunx expo start --ios
# On Linux, use make dev and open the tunnel in Expo Go on an iPhone or iPad.
```

The app targets Expo SDK 57 and uses its bundled native modules. Start Expo once after adding routes to regenerate Router’s types. Rebuild an existing development client after changing native dependencies.

`make update` updates packages within compatible ranges, aligns Expo dependencies, regenerates globe geometry and license notices, and runs Expo Doctor. The `react-native-screens` override matches the native version included in Expo Go; align it when changing SDKs. Install app dependencies with `bunx expo install`.

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
- `src/atlas/`: shared map selection, colors, label/callout placement, and the flat camera/renderer. `src/globe/` owns spherical camera math, GPU geometry, picking, gestures, and rendering. Only the active view mounts.
- `src/settings/`: small settings layouts and native backup file operations. `src/components/` and `src/theme.ts` centralize reusable controls, typography, spacing, surfaces, state colors, and appearance.
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

```sh
bun test
bun run globe:check
bun run licenses:check
bunx expo lint
bunx tsc --noEmit
bunx expo-doctor
bunx expo export --platform ios
```

Tests cover travel/home invariants, bulk changes, Undo, persistence ordering and failure recovery, atomic restore, backup validation, catalog filtering/counts, geometry, cameras, picking, annotations, frame lifecycle, and theme contrast.

Before shipping, verify on physical iPhone and iPad:

- Globe/world-map switching preserves each camera. Drag, focal pinch, twist, north-up, search focus, and fit controls work across zoom limits, poles, and the antimeridian. Idle/background views stop rendering.
- Callouts remain readable inside safe areas, follow selection, hide behind the globe or outside the viewport, and return after details. Small islands, polygon holes, and overseas territories remain selectable.
- Country edits, bulk actions, home changes, Undo, Stats drilldowns, filter cancellation, and Show on map agree across tabs and survive relaunch where appropriate.
- Backup export/import cancellation, invalid files, failed saves, and failed restores recover without partial data. Retry remains available and storage errors are announced once when they appear.
- Native tabs, sheets, search keyboards, and Settings remain usable on short/resizable iPad windows, at the largest Dynamic Type sizes, with VoiceOver and Reduce Motion enabled.
- After loading the bundle, all geography, facts, editing, and license notices work offline. Check smooth native rendering on-device; passing JavaScript tests or an export does not establish iOS visual quality or frame rate.
