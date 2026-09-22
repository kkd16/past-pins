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
- `src/countries/`: the country screen, map, checklist, catalog/search, and storage interface.
- `src/storage/`: storage implementations; `visits.ts` selects the app's backend.
- `src/app/`: Expo Router entry points and dependency wiring.

Prefer existing controls and native props. Keep country-specific code together; extract shared pieces when they have a clear use. There is no light theme or theme provider.

## Map and checklist data

Both use `@svg-maps/world` directly. The package's 256 named shapes define this first version's collection; this is a map dataset, not an official count of sovereign countries. Names and IDs stay as supplied upstream. The checklist is A–Z with name/code search, and the displayed total is derived from the data.

There is no catalog join, custom geographic override, generated map pipeline, or runtime network request. Very small places can be selected through the list or by zooming the map. The dataset omits Antarctica and includes some islands as separate places. Country-name aliases, flags, and continent grouping are deferred to keep this iteration small.

To update data, use `bunx expo install @svg-maps/world --bun` and review the upstream changes. Persisted IDs must remain compatible; changes to IDs need an explicit migration before shipping. Unexpected saved IDs produce an error instead of being silently removed.

## Saved visits

AsyncStorage stores `{ version: 1, visitedIds: [...] }` under `past-pins.visits.v1`. Reads finish before editing is enabled; writes are serialized so quick checks cannot save out of order. Failed saves show a retry action. Invalid saved data stays untouched unless the user explicitly confirms a reset.

To swap storage, implement [VisitStorage](src/countries/visit-storage.ts) (`load` and `save`) and select it in `src/storage/visits.ts`. The route injects it; the UI and hook do not depend on AsyncStorage or JSON. Keep the adapter stable for the screen's lifetime and preserve validation, ordered snapshot writes, and error handling. Migrate existing visits explicitly when changing backends.

## Attribution

The map is based on [MapSVG's world map](https://mapsvg.com/maps/world), adapted and packaged by [Victor Cazanave / svg-maps](https://github.com/VictorCazanave/svg-maps). It is licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). PastPins applies its own colors and visited/selection states; the supplied paths are unchanged. See `licenses/svg-maps-CC-BY-4.0.md` for the license.
