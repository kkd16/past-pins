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

- `src/theme.ts`: the permanent dark palette, text variants, spacing, radii, control sizes, and motion. Change shared visual decisions here.
- `src/components/ui/`: reusable text, buttons, search, and check rows. Native props and layout styles remain available; common interaction styling lives in these components.
- `src/features/countries/`: the screen, map, checklist, catalog, and local persistence. Components receive data and callbacks; the visits hook owns state.
- `src/app/`: Expo Router entry points only.

Use the existing native components and shared controls before adding abstractions. Add a shared token or variant when it represents a real shared choice. There is no light theme or theme provider.

## Map and checklist data

Both use `@svg-maps/world` directly. The package's 256 named shapes define this first version's collection; this is a map dataset, not an official count of sovereign countries. Names and IDs stay as supplied upstream. The checklist is A–Z with name/code search, and the displayed total is derived from the data.

There is no catalog join, custom geographic override, generated map pipeline, or runtime network request. Very small places can be selected through the list or by zooming the map. The dataset omits Antarctica and includes some islands as separate places. Country-name aliases, flags, and continent grouping are deferred to keep this iteration small.

To update data, use `bunx expo install @svg-maps/world --bun` and review the upstream changes. Persisted IDs must remain compatible; changes to IDs need an explicit migration before shipping. Unexpected saved IDs produce an error instead of being silently removed.

## Saved visits

AsyncStorage stores `{ version: 1, visitedIds: [...] }` under `past-pins.visits.v1`. Reads finish before editing is enabled; writes are serialized so quick checks cannot save out of order. Failed saves show a retry action. Invalid saved data stays untouched unless the user explicitly confirms a reset.

## Attribution

The map is based on [MapSVG's world map](https://mapsvg.com/maps/world), adapted and packaged by [Victor Cazanave / svg-maps](https://github.com/VictorCazanave/svg-maps). It is licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). PastPins applies its own colors and visited/selection states; the supplied paths are unchanged. See `licenses/svg-maps-CC-BY-4.0.md` for the license.
