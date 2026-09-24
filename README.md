# PastPins

An offline, dark-only iOS travel atlas for iPhone and iPad. It opens on the map, with Countries on the left and Stats on the right.

## Develop

```sh
bun install
bunx expo start --ios
# On a Linux host, use make dev and open the tunnel on an iPhone or iPad.
bun test
bun run globe:check
bunx expo lint
bunx tsc --noEmit
bunx expo-doctor
bunx expo export --platform ios
```

Expo generates typed routes when the development server starts. Start it once after adding routes before running TypeScript. Native modules used here are included in SDK 57 Expo Go. Rebuild an existing development client after adding native dependencies.

`make update` updates the dependency tree within compatible ranges, aligns native packages with Expo, regenerates the globe, and runs Expo Doctor. The `react-native-screens` override keeps Router's wider dependency range on the same native version included in Expo Go; align that override when changing SDKs.

## App structure

- `src/app/`: thin Expo Router routes, native tabs, and native form sheets. The map is the index route and default tab.
- `src/screens/`: screen composition and interactions. Countries keeps its search and visit-status selection while mounted; continent and grouping choices travel through Router parameters.
- `src/countries/`: the app-owned catalog and types, pure search/filter/statistics functions, country UI, and the shared visits provider.
- `src/globe/`: the native graphics surface, GPU renderer/shaders, camera math, country picking, gestures, and frame lifecycle. The controller retains the camera across sheets and tab switches.
- `scripts/`: deterministic globe generation from the installed geographic data. These tools are not bundled into the application.
- `src/components/`: reusable controls and layouts. `Screen` applies native safe-area insets, including the tab bar. Its scrollable children use no automatic insets. Sheets scroll their full contents for large text.
- `src/hooks/`: the visits lifecycle and persistence hook.
- `src/storage/`: the SQLite adapter and application storage wiring.
- `src/theme.ts`: shared colors, typography, spacing, and sizing.

The root mounts one `VisitsProvider` with an injected `VisitStorage`. All tabs and sheets consume that same state. Presentational country rows receive data and callbacks; filtering and statistics are ordinary functions with no UI or storage dependencies. Screens never import upstream geographic data directly.

## Map and catalog

`catalog.ts` joins polygon data from `@rembish/iso-topojson/iso-a2.json` to `countries-list` continent metadata by ISO alpha-2 code. The current map contains 250 places, including countries, dependent territories, Antarctica, and Kosovo. This is the map's catalog, not a count of sovereign states. Names and boundaries follow the map package; primary continent assignments follow the metadata package.

`geography.ts` converts the published topology to features. The catalog joins them to country metadata independently of rendering. Picking checks the front of the sphere against the original polygons; small places can also be selected through Countries. All geographic data is bundled, with no place-specific overrides.

`bun run globe:generate` builds `src/globe/world.json` using gnomonic projection, Earcut, and shared spherical edge subdivision. Zero-area features get a marker at their source centroid. Generation checks coverage and projection bounds. `bun run globe:check` detects stale assets; tests compare country areas and triangle interiors against the source.

Expo GL draws cached geometry in four batches. Gestures update the camera without React renders. Frames run on changes and during inertia, stop while hidden or backgrounded, and honor Reduce Motion. The renderer works in Expo Go without a mapping service or account.

The globe starts facing the Atlantic at 120% of the shorter viewport dimension. Pinch out for the whole sphere, zoom in for detail, or reset the original view.

## Visits

Visits are binary and stored locally in `past-pins-visits.db`. The `visited_countries` table contains a primary-key `country_id` for each visited place. This implementation uses its own database directly; there are no migrations or legacy storage readers.

Reads finish before editing is enabled. Writes are serialized and transactional; each saves a snapshot. Edits appear immediately across the app, while failures display retry controls and are announced once to VoiceOver when the error appears. Statistics remain unavailable until saved visits have loaded.

Country details save immediately. List filters apply with Done; swiping their sheet away discards the draft. Search, filters, and map zoom survive tab switches but are not persisted across a fresh launch.

## Validation

Bun tests cover catalog joins, geometry coverage and winding, camera/picking, frame scheduling and cleanup, search, combined filtering, grouping, statistics, and SQLite ordering/rollback/retry behavior. Before shipping, check on physical iPhone and iPad through Expo Go:

- Cold launch selects the center Map tab; tab switches preserve map zoom and list state.
- Drag freely over the poles and across the antimeridian; pinch to both zoom limits; reset restores the launch view. Rotation should remain smooth at 60 Hz, with no continuous frames while idle. Linux shader/geometry checks do not establish native performance.
- Selecting a country or country name opens the same detail sheet; dragging, pinching, and two-finger taps must never open it. Both the sheet's switch and list checkmarks update every tab and persist after relaunch.
- Background/resume, tab changes, sheet dismissal, and iPad window resizing preserve orientation and zoom, redraw correctly, and leave all controls inside safe areas. Check the largest Dynamic Type sizes on a short iPad window.
- Filters intersect with search and visit status; Done applies and swipe dismissal cancels.
- Insets, native tabs, sheet expansion, keyboards, and text remain usable at large Dynamic Type sizes, with VoiceOver and Reduce Motion enabled.
- At the largest text size, Countries controls and results scroll together; typing retains focus and does not reset scroll. Test on a small iPhone and a short iPad window with the keyboard open.
- Simulate a storage failure: VoiceOver announces it once across mounted tabs, retry remains available, and a new failure after successful recovery is announced again.
- After loading the development bundle, all globe data and visit editing work offline. Expo Go still needs its normal Metro connection to load a fresh development session.

## Attribution

Map data © 2026 Alex Rembish, [iso-topojson](https://github.com/rembish/iso-topojson), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), based on [Natural Earth](https://www.naturalearthdata.com/) public-domain data. PastPins projects the supplied geometry and changes its styling and visit colors.

Continent metadata comes from [Countries by Annexare](https://github.com/annexare/Countries), MIT licensed. Geometry generation uses [Earcut](https://github.com/mapbox/earcut), ISC licensed. Attribution and bundled notices for the map, metadata, geometry, graphics, gestures, and segmented-control dependencies are accessible in Stats. `licenses/map-and-controls.json` contains the installed packages’ license text; refresh it from their `LICENSE` files when updating those dependencies.
