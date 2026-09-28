# Development

[← PastPins](README.md) · [Project rules](AGENTS.md)

[Setup](#run-locally) · [Code](#code) · [Data](#data-format) · [Currencies](#currency-metadata) · [Geography](#geography) · [Website](#website) · [Releases](#release-an-update)

## Run locally

Use the Bun version in [package.json](package.json), Node.js 22.13+, and an iPhone. The app uses Expo SDK 57.

1. Install dependencies: `bun install --frozen-lockfile`.
2. Build a development client using the linked EAS project:

   ```sh
   bunx eas-cli login
   bunx eas-cli build --platform ios --profile development
   ```

3. Install the build on your registered iPhone, then run `bunx expo start --dev-client`.
   - Add `--tunnel` if the phone cannot reach Metro, including from Linux.
   - `bun run dev` uses Expo Go for quick UI checks. Background reminders and native reset require a development or TestFlight build.

### Everyday commands

- **Checks**
  - `bun run lint` and `bun run typecheck` before finishing a task.
  - `bun test --watch` for focused development.
  - `bun run verify` before every push, after the final edit, merge, or rebase. Require exit code 0; CI runs the same [script](scripts/verify.sh).
- **Dependencies**
  - `bunx expo install <package>` to add an app dependency.
  - `bun run deps:update` to update dependencies, align Expo versions, regenerate assets, and verify.
  - `bun run` lists all scripts.
- **Native changes**
  - Check the [SDK 57 docs](https://docs.expo.dev/versions/v57.0.0/) and [Expo index](https://docs.expo.dev/llms.txt).
  - Configure through `app.json`, `app.config.ts`, and plugins; never edit generated `ios/` files. Rebuild after native dependency or configuration changes.
  - After Worklets, Reanimated, or Babel changes: `bunx expo start --dev-client --clear`.

## Code

- **Navigation and UI:** `src/app/`, `src/screens/`, `src/navigation/`, `src/components/`.
- **Travel and search:** `src/countries/`, `src/places/`, `src/lists/`, `src/stamps/`.
- **Maps:** `src/atlas/`, `src/globe/`, `src/subdivisions/`, `src/cities/`.
- **Storage and recovery:** `src/data/`, `src/storage/`, `src/recovery/`, `modules/past-pins-recovery/`.
- **Text:** `src/localization/locales/<language>/`; use typed `t` and shared formatters.

Key patterns:

- Read with `useAppData`; mutate through `appData`. Select primitives or existing immutable references.
- For async UI actions, capture `isCurrent = guard()` from `useActionGuard`, recheck before applying results, and pass it to `setStatus` for confirmations.
- Keep app imports behind the root recovery boundary. `index.js` registers the background arrival task before Router.

## Data format

The v1 document is `{ app: "past-pins", schemaVersion: 1, data }`.

Omitted fields within `preferences` use defaults; saves write all preferences. Invalid values, unknown fields, and missing required data are rejected.

- **Model:** [model.ts](src/data/model.ts) defines transitions; [document.ts](src/data/document.ts) decodes both saved files and imports.
  - Countries, regions, and cities share one status map; lists store catalog IDs.
  - Lived counts as Visited; home marks its country Lived. Child visits promote parents, but removing a child preserves parent history.
  - Lowering a parent confirms changes to contained visits and home. Wishlists and lists are independent.
- **Persistence:** [document-storage.ts](src/storage/document-storage.ts) serializes atomic writes of one document.
  - Edits publish immediately; failed saves offer Retry. Unsaved changes can be lost on exit.
  - Imports and resets publish after saving succeeds. Import replaces current data; export first to keep it.
  - Preserve unknown, future, or corrupt documents for recovery. Never silently reset or discard unknown IDs.

### Recovery and reset

- **Settings → Your saved data:** raw saved-file export, backup import, diagnostics, and reset.
- **Clear travel:** removes travel, lists, and home; keeps preferences and reminder history.
- **Reset preferences:** keeps travel and disables reminders.
- **Full reset:** clears app data, reminders, diagnostics, temporary backups, and session state; returns to Welcome.
- **iPhone Settings → Apps → PastPins → Reset on Next Launch:** force-quit and reopen to delete owned files before JavaScript.
  - Failed deletion keeps the request pending and blocks storage until a successful cold launch.
  - External backups and iOS permissions survive resets.

New stores need backup/reset rules and registration in [owned-files.json](src/storage/owned-files.json). Keep reminder bookkeeping outside backups. Diagnostics are local, capped at 50 allowlisted events, and exclude raw errors and user data. Support reports require consent and open an email draft; nothing sends automatically.

## Currency metadata

Currencies come from `countries-list`, excluding financial fund codes from the saved SIX ISO 4217 XML.

- `bun run currencies:refresh` downloads current data. Review and commit [the snapshot](scripts/data/currencies.xml) and [generated codes](src/countries/fund-codes.json) together.
- `bun run currencies:generate` rebuilds from the snapshot; rerun after interrupted generation. `bun run currencies:check` verifies offline.
- Dependency updates use saved sources. Currency metadata does not change stored place IDs.

## Geography

- **World:** `@rembish/iso-topojson`.
- **Regions:** Natural Earth, pinned in [subdivisions-source.json](scripts/data/subdivisions-source.json). IDs: `ne:<ne_id>`.
  - Administrative levels, boundary age, and coverage vary. Its [de facto boundary policy](https://www.naturalearthdata.com/about/disputed-boundaries-policy/) may differ from the ISO world map.
- **Cities:** offline GeoNames cities500 snapshots, tracked in [cities-source.json](scripts/data/cities-source.json). IDs: `city:<geonameid>`.
  - Region links require reliable source IDs and same-country containment; otherwise cities track their country. No hand-authored records, aliases, or geographic overrides.
  - Keep SQLite search paginated. Backups store IDs/statuses, not the catalog. In-app resets retain its public cache; catalog retry reimports it and native reset deletes it.

Update workflow:

1. `bun run generate` rebuilds from saved sources.
   - `bun run subdivisions:refresh` redownloads the same pinned source.
   - `bun run cities:refresh` fetches current GeoNames snapshots and regenerates.
2. Review licenses, boundary policy, checksums, dates, removed/reassigned IDs, and list references.
3. Commit sources and generated assets together; never hand-edit generated files. Check coverage, tiny islands, and the antimeridian. Update attribution and run `bun run verify`.

## Website

- Text: [website.json](src/localization/locales/en/website.json). Layout/styles: [website/](website/).
- `bun run website:build` writes `_site/`. CI verifies pull requests and deploys `main` to GitHub Pages. Keep the `/past-pins/` base path.
- App Store URLs: [Marketing](https://kkd16.github.io/past-pins/), [Privacy](https://kkd16.github.io/past-pins/privacy/), [Support](https://kkd16.github.io/past-pins/support/). Check live pages after deployment and keep disclosures consistent with the app.

## Release an update

Use the existing EAS project, Apple team, and App Store Connect record for `io.github.kkd16.pastpins`. Never commit credentials. No OTA channel is configured.

1. **Prepare:** set `expo.version` in `app.json`; match it with `bun pm pkg set version=1.0.1` (replace the example).
   - Review the [data contract](#data-format), run `bun run licenses:generate`, then `bun run verify` and commit.
2. **Build:** `bunx eas-cli build --platform ios --profile production`.
   - EAS increments the build number. Record the build ID, app/build versions, and source commit.
   - Check [Apple’s current requirements](https://developer.apple.com/news/upcoming-requirements/) and the `.ipa` identity, iPhone targeting, icon, reset settings, background modes, network security, and privacy manifests/signatures.
   - Publish source and notices [as below](#source-and-license-obligations) before distribution.
3. **TestFlight:** `bunx eas-cli submit --platform ios --profile production --id BUILD_ID`.
   - Resolve processing/compliance questions and run the [iPhone checks](#on-an-iphone). After fixes, verify, rebuild, and retest.
4. **App Review:** create the matching version and select the tested build.
   - Update release notes, screenshots, URLs, privacy disclosures, age rating, export compliance, agreements, and reviewer details. Explain permissions, reminders, backups, and recovery; no sign-in is required.
5. **Release:** choose timing/phased rollout, submit, and monitor crashes and support feedback.
   - If needed, pause rollout and ship a newer compatible version. Never downgrade or erase saved data.

### Source and license obligations

For every distributed build, including TestFlight:

- Include [GPL](LICENSE), [App Store permission](COPYING.iOS), copyright, and third-party notices.
- Tag the exact revision; publish corresponding source, required dependency source, and build instructions. Provide a source release link alongside the binary as permitted by GPL section 6; a moving `main` link is insufficient.
- Exclude credentials and verify distribution rights. The App Store permission preserves GPL obligations and does not cover third-party GPL-only code.

### On an iPhone

Record device, iOS version, build, and results. Use disposable data for destructive checks and a development build for failure injection.

- **Data:** fresh install, offline edits, relaunch, v1 fixture round-trips, mixed lists/preferences, export/reset/import, and cancelled or invalid imports.
  - Inject failed/interrupted writes, future/corrupt documents, and unavailable storage. Confirm recovery/export/retry preserve data.
- **Native reset:** cold-launch deletion, cancellation, deletion failure/retry, and return to Welcome with reminders/diagnostics cleared and the switch off.
- **Flows:** maps, status/home, lists, sharing, stale confirmations, permissions, IPv6-only networks, and exported images.
  - Support: consent/cancel and different email apps or none installed. Error reports include the log; bug reports include only app/device details; feature requests include no diagnostics.
- **Reminders:** background delivery, cold-launch notification taps, revoked permissions, disabling reminders, battery, and heat.
- **Accessibility:** small iPhones, largest text, VoiceOver, long translations, supported locales/RTL, Reduce Motion, sheets, and pickers.

Native recovery changes require a new build and physical cold-launch/reset checks. JavaScript tests and exports do not replace device testing; report checks you could not run.
