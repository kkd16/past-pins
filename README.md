# PastPins

An offline travel atlas for iPhone and iPad, with one dark green theme. It opens on the Map tab; Countries, Lists, and Stats connect the same collection of places.

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
| `bun run generate` | Regenerate map geometry and license notices |
| `bun run subdivisions:refresh` | Download the pinned region source again, verify it, and regenerate offline region maps |
| `bun run subdivisions:check` | Verify region source/generator and output hashes without network access |
| `bun run deps:update` | Update compatible dependencies, align Expo versions, regenerate assets, and run all checks |
| `bun run reset` | Reinstall locked dependencies and clear this project's Expo state |

Reset leaves other projects' Metro caches and Watchman watches alone. The `react-native-screens` override matches the native version included in Expo Go; align it when changing SDKs. Install app dependencies with `bunx expo install`, then run `bun run generate` to refresh affected bundled assets.

## Product flows

- **Map:** switch between the native GL globe and an Equal Earth world map. Each keeps its own camera during the session. Drag, pinch, and—with the globe—twist two fingers. Search finds countries and regions: a country focuses the world map, while a region opens its focused regional map. A selected country also offers a direct regions shortcut. Current location centers the device’s coordinates; North up straightens the globe; Fit world restores the flat overview.
- **Location suggestions:** on launch and return from the background, request optional When In Use location access and look up the current country with iOS reverse geocoding. Offer to mark it Visited only when it is neither Visited nor Lived. Confirmation uses the usual save and Undo flow. Each country is suggested at most once per session. Unavailable locations, denied permission, and unsuccessful country lookups are silent on open; the map button explains location failures. Country lookup may need a network connection; it does not block map positioning. Coordinates are not saved or included in backups.
- **Country selection:** tap a place for a small anchored name/status callout, then tap the callout for details. Closing details preserves selection and camera. Tap ocean to dismiss selection. Labels are sparse and automatically placed.
- **Places:** switch between Countries and Regions with the same search and travel-status filters. Countries can be grouped by continent or alphabetically; Regions searches all supported states, provinces, and other divisions directly, including their parent country names and source codes. Continent filters use Cancel/Apply. Country rows show region progress with a direct region shortcut. Country selection mode updates multiple results together; changing the search, mode, or result set clears selection.
- **Details:** edit status and current home, read available capital/language/currency facts, or Show on map. Changes save immediately. There are no dates, notes, or timelines.
- **States & provinces:** open directly from Places, map search, country rows/details, custom lists, or matching Stats drilldowns. A region row opens its map/context and has separate quick status and Save to lists controls. Country details put region progress first; the region screen links back to its country. Pinch/pan the offline map or search its list, with bulk selection for status changes. Coverage includes other administrative units such as districts and departments, according to the bundled source.
- **Lists:** name a custom list, then add countries and regions with a searchable picker. All places searches countries and regions together; country rows drill into their regions inside the same picker. Selected reviews the complete draft. Browsing and filtering preserve selections; Save applies them once, while Cancel discards them. The list shows an offline map and visited progress from existing travel statuses. On the world overview, filled countries are list members and outlined countries contain listed regions. A list containing only regions of one country shows their actual boundaries, highlighting member regions and framing them with nearby context. Open a place for details, explore a listed country’s regions directly, or change its travel status. Country details and individual region rows also offer Save to lists. Rename, membership edits, and deletion support Undo. Lists have no separate completion state, notes, dates, or network dependency.
- **Stats:** country and region progress appear together, with visited, wishlist, lived, and remaining summaries opening matching Places results. Country continent summaries retain their drilldowns. Counts stay separate and percentages count catalog entries rather than land area. The gear opens Settings.
- **Stamp collection:** open the album from Stats or preview an individual stamp from country details. Visited and Lived countries automatically collect stamps; Wishlist stays available to collect. Search Collected, All stamps, or To collect, then open a stamp to change travel status or show its country on the map. Artwork uses bundled country outlines, paper frames, and stable ink colors; collapsed or extremely thin source shapes use a neutral location pin. Country names and statuses remain native, accessible text outside the decorative art. The collection follows edits, Undo, home, restore, and reset without separate saved state; regions do not collect country stamps.
- **Settings:** choose map preferences, home, list organization, and haptics. Export or restore a backup, clear travel data, reset preferences, or reset the entire app after confirmation. About includes app and data versions, project/profile links, and map credits; license notices are available offline.

A place is unmarked, Wishlist, Visited, or Lived. Lived always counts as Visited; Not visited includes Wishlist. Setting current home marks that country Lived. Moving or clearing home keeps former homes in Lived. Bulk Mark visited preserves existing Lived status; a single-country status menu or details can explicitly downgrade it. Changing the current home’s status away from Lived asks to clear home too.

Region statuses follow the same Visited/Lived/Wishlist rules but are independent of country statuses. Neither a country edit nor a region edit changes the other. This avoids treating a country visit as a visit to every region or silently erasing detailed region history. Region progress is shown separately from country totals. Undo covers both kinds of travel edits; clear travel data and complete reset remove both.

Undo appears in a toast after an individual, bulk, home, or custom-list edit and restores that edit without reverting preferences. Toasts dismiss after 6 seconds (15 with VoiceOver), pause while data is busy, and can be dismissed manually. Another travel or list edit replaces Undo; dismissal, restore, and reset clear it.

## Architecture and data

- `src/app/`: thin Expo Router routes, native tabs, and one native stack for detail sheets and Settings.
- `src/screens/`: page composition and connected navigation flows. Search typing stays local; route parameters carry navigation requests, country/region mode, scope, and continent. Grouping is a persisted preference.
- `src/countries/`: authoritative catalog joins, country facts, pure search/filter/statistics functions, and country controls.
- `src/subdivisions/`: generated regional catalogs and SVG maps, country-scoped region search and statistics, region controls, and map interaction. Geography is generated before bundling and never fetched by the app.
- `src/places/`: shared offline country/region search index, country-filtered discovery, global region filters, and the Places mode control. Map search, list pickers, and Places use the same source IDs and names.
- `src/lists/`: derived list progress, compact source-based maps, and native list-name prompts. List membership stores existing catalog IDs rather than copying geographic data.
- `src/stamps/`: derived country collection, source-based stamp artwork, and the Stats album entry. Stamps use existing country statuses and add no backup fields.
- `src/data/`: the app snapshot, pure status/home transitions, current-format backup validation, and one shared store/provider with Undo.
- `src/location/`: shared foreground location lookup and launch/resume visit suggestions. No background tracking or location history.
- `src/storage/`: serialized snapshot persistence through Expo SQLite key-value storage.
- `src/atlas/`: map toolbar and summary, shared selection, colors, label/callout placement, and the flat camera/renderer. `src/globe/` owns spherical camera math, GPU geometry, picking, gestures, and rendering. Each view mounts on its first visit and stays mounted; inactive views stop rendering and ignore gestures.
- `src/settings/`: small settings layouts and native backup file operations. `src/components/` and `src/theme.ts` centralize reusable controls, typography, spacing, surfaces, state colors, and appearance. `AppPressable` supplies touch targets and interaction feedback while forwarding native props; `ChoiceSection` and `ToggleRow` keep radio groups and native switches consistent across screens.
- `src/motion/`: one shared Reduce Motion subscription. Press feedback, callout entrances, checks, and progress use native-driven animation; bulk selection uses native layout animation. Timings live in the theme. Native navigation keeps its standard transitions.
- `src/feedback/`: one toast host above native tabs and sheets. `useToast().showToast({ message, action? })` replaces the current toast; IDs keep expired actions and animation callbacks from affecting newer messages.
- `src/localization/`: JSON resources grouped by language code, typed lookups, iOS locale selection, and shared number/list formatting. Domain catalogs keep copy beside its owning feature without spreading strings through UI code.
- `scripts/`: deterministic geography and license generation; these tools are not bundled into the app.

One `AppDataProvider` owns statuses, custom lists, current home, and preferences. Rows receive data and callbacks; derived filters and totals remain ordinary functions. Persistence writes one complete JSON snapshot under `app-data` in `past-pins-app.db`. Writes are ordered and atomic at the key-value boundary. Edits publish immediately; failed writes offer Retry save. Initial loading gates editing.

Backups use version 1 with the current schema. Country statuses, region statuses, and custom lists are required. This is a hard cutover with no migrations or legacy readers. Reset existing development data through Settings if it uses an earlier schema. Import validates the current format before offering a country/region/list count preview, then replaces the stored snapshot before publishing it. A failed restore preserves current state. Clearing travel data removes countries, regions, lists, and home while keeping preferences; resetting preferences preserves all travel data. Complete reset erases all database keys and temporary backup files, clears Undo and navigation state, and returns to the initial Map tab. Exported backups outside the app and iOS permissions are unchanged.

Map mode, labels, summary, haptics, and list organization persist across launches. Cameras, selections, search/filter state, and Undo are session-only. Location permission is optional; browsing and editing work without it. No accounts, remote tiles, or cloud sync are required. Expo Go still needs Metro to load a fresh development bundle. `app.config.ts` adds the location plugin with permission text from the English JSON resources; rebuild existing iOS development clients after installing this native module.

## Geography and notices

`@rembish/iso-topojson/iso-a2.json` supplies names and polygons; `countries-list` supplies primary continents and available country facts. The catalog includes countries, territories, Antarctica, and Kosovo. It is not a count of sovereign states. Geography is bundled and contains no hand-maintained country coordinates or overrides.

`bun run globe:generate` derives globe triangles, country anchors, flat-map SVG paths, and focus bounds from the installed source, including tiny-place markers. GL and SVG render these bundled assets without rebuilding country paths at app startup. The flat view and asset generator share D3’s Equal Earth projection. Label candidates and focus anchors come from source polygons, with the main landmass used for country focus. Rendering stops while hidden or backgrounded; animation respects Reduce Motion.

Map data © Alex Rembish, [iso-topojson](https://github.com/rembish/iso-topojson), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), based on [Natural Earth](https://www.naturalearthdata.com/) public-domain data. PastPins transforms geometry, projection, labeling, and styling. Country facts come from [Countries by Annexare](https://github.com/annexare/Countries).

Regional boundaries and names are generated from [Natural Earth Admin 1](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/), a public-domain cartographic dataset. The source is pinned by Git commit and SHA-256 in `scripts/data/subdivisions-source.json`; `src/subdivisions/manifest.json` records coverage and generated-file hashes. Names, IDs, membership, and shapes come from that source without hand-written country overrides. Natural Earth feature IDs, rather than translated names or potentially duplicate ISO-style codes, identify saved regions.

Natural Earth is a cartographic source, not a live government registry. Administrative levels vary between countries; some names and boundaries reflect older arrangements. About shows the source version and snapshot date. Undivided-country placeholders and synthetic offshore units are excluded. See [regional data maintenance and limitations](scripts/data/SUBDIVISIONS.md) for provenance, known limitations, refresh commands, and the required saved-ID audit when updating the source pin. Generation downloads the pinned source only when its verified temporary cache is missing or `--refresh` is requested. Normal app use and `subdivisions:check` are offline; the latter checks recorded input/output hashes, while generation reproduces the assets.

`bun run licenses:generate` rebuilds bundled third-party notices from installed package metadata and license files. Settings contains map credits and searchable offline notices.

## Validation

Localization uses [`expo-localization`](https://docs.expo.dev/versions/v57.0.0/sdk/localization/) and [`i18n-js`](https://github.com/fnando/i18n), with English currently shipped and used as fallback. JSON resources live in `src/localization/locales/en/`; a thin TypeScript layer supplies typed keys and native number formatting. The library handles locale fallback, interpolation, plurals, and lists. Country facts use bundled English source names and currency codes. To add a language, supply complete messages, the library’s base formatting translations and plural rules, geographic name data supported by Hermes, and matching native supported locales. Stored IDs and original legal notices stay unchanged. Lint rejects raw JSX text and literal text labels.

Accessibility uses native iOS controls, scalable text, semantic control states, logical spacing, and 44-point targets. VoiceOver and large text get a stable selected-country card; map accessibility actions provide zoom and pan without multi-finger gestures. Reduce Motion skips custom transitions and finishes an active camera move at its destination. Keep manual device checks below part of each platform upgrade.

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
- Lists: create, rename, and delete; select countries and regions across searches; use Selected to remove members; cancel and save the picker; add a place to several lists from its details. Verify mixed-country/region progress after status changes, map fill/outline meaning, a single-country region preview including tiny regions, Undo, relaunch, backup restore, reset, and stale/deleted-list routes. Check native prompts, long list names, keyboard avoidance, VoiceOver, largest Dynamic Type, Reduce Motion, and short iPad layouts.
- Stamps: open the album from Stats and individual previews from country details. Search and change all three filters, collect an unvisited or wishlisted country, remove a collected stamp through its status menu, and Undo. Check home changes, backup restore, reset, invalid stamp routes, and Show on map. Verify VoiceOver labels and order, long names, largest Dynamic Type, rotation, Reduce Motion, and short iPad layouts; outlines must never mirror with language direction.
- Places and regions: switch Countries/Regions with a query and status filter, filter by continent, search a province by name/code/country, and use country-row shortcuts. Test Stats drilldowns after visiting the other mode; filters, Home selection, repeated navigation requests, and reset should retain the correct scope. Navigate from country sheets, map selection/search, and lists, return to the original screen, and test deep links. Pan/pinch country maps, reset, focus the same region repeatedly, and select small islands or dense districts using the list. Region names should focus the map, status icons should edit, and Save to lists should work without selecting the map first. Test US, Canada, Japan, Fiji, Russia, and New Zealand for far-flung islands and date-line crossings. Check search, each status filter, bulk editing, Undo across country/region edits, persistence, current-format restore previews, rejection of old backups, and reset. Confirm no country edit implicitly changes region statuses or vice versa. Check VoiceOver order/actions, long names, large Dynamic Type, Reduce Motion, and short iPad layouts.
- Location: test Allow Once, While Using, denial, disabled services, approximate location, no location fix, and offline country lookup. Launch/resume suggests unmarked or wishlisted countries, skips Visited/Lived, and does not repeat a dismissed country during that session. Confirm and Undo agree across tabs. Current location works with no saved home and centers the actual coordinates in both map modes. Check the location button with VoiceOver and large text on iPhone and short iPad windows.
- Toasts remain reachable above sheets, expire after repeated edits, and leave the rest of the screen accessible to VoiceOver. Check long text, large Dynamic Type, Reduce Motion, and short iPad windows.
- Backup export/import cancellation, invalid files, failed saves, and failed restores recover without partial data. Retry remains available and storage errors are announced once when they appear. Complete reset cancels safely, removes saved data across relaunch, clears tab filters and map cameras, and remains available after a failed load.
- Native tabs, sheets, search keyboards, and Settings remain usable on short/resizable iPad windows, at the largest Dynamic Type sizes, with VoiceOver and Reduce Motion enabled.
- After loading the bundle, all geography, facts, editing, and license notices work offline. Check smooth native rendering on-device; passing JavaScript tests or an export does not establish iOS visual quality or frame rate.
