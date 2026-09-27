# Development

[← PastPins](README.md)

[Run locally](#run-locally) · [Code](#code) · [Data upgrades](#data-upgrades) · [Geography](#geography) · [Release](#release)

## Run locally

Use the Bun version in [package.json](package.json), Node.js 22.13+, and an iPhone. The app uses Expo SDK 57 and intentionally sets `ios.supportsTablet` to `false`.

```sh
bun install --frozen-lockfile
bun run ios
```

On Linux, use `bun run dev` for a tunnel and open it in Expo Go on an iPhone. Expo Go supports the main UI; background arrival monitoring and the native Settings reset require an installed development or TestFlight build. For a development client, install `expo-dev-client` with `bunx expo install expo-dev-client`, configure EAS as described under [Release](#release), and run `bunx eas-cli build --platform ios --profile development`.

| Command | Use |
| --- | --- |
| `bun run check` | Lint, typecheck, tests with coverage, generated-asset checks |
| `bun run verify` | Full pre-push/CI gate, including Expo Doctor and both iOS exports |
| `bun test --watch` or `bun test backup` | Focused test iteration |
| `bunx expo install <package>` | Install an Expo-compatible app dependency |
| `bun run generate` | Regenerate geography and third-party notices |
| `bun run deps:update` | Update dependencies, align Expo versions, regenerate, verify |

Run `bun run verify` before every push, after the final edit or rebase. GitHub Actions invokes the same [scripts/verify.sh](scripts/verify.sh); keep the check list there. Typecheck refreshes Router’s generated types, so it works on a fresh checkout. Coverage measures loaded JavaScript, not native behavior.

Use Expo’s matching versioned docs before changing native APIs. Rebuild the iPhone app after native dependency, module, or configuration changes. Native projects are generated through CNG; configure them through `app.config.ts` and plugins rather than editing `ios/`. After Worklets/Reanimated/Babel updates, restart Metro with `bun run dev --clear`. `bun run` lists the remaining scripts; the Makefile only supplies aliases.

## Code

| Location | Responsibility |
| --- | --- |
| `src/app/`, `src/screens/`, `src/navigation/` | Thin Router routes, screens, navigation and stale-action guards |
| `src/data/`, `src/storage/` | Shared data store, pure mutations, versioned documents, serialized SQLite persistence |
| `src/recovery/`, `modules/past-pins-recovery/`, `plugins/with-recovery.js` | Recovery UI, local diagnostics, native cold-launch reset |
| `src/atlas/`, `src/globe/`, `src/subdivisions/` | Shared map interaction, globe rendering, regional maps |
| `src/countries/`, `src/places/`, `src/lists/`, `src/stamps/`, `src/sharing/` | Catalogs, search, lists, derived collections, image sharing |
| `src/components/`, `src/theme.ts`, `src/feedback/`, `src/motion/` | Reusable controls, styling, confirmations, toasts, Reduce Motion |
| `src/onboarding/`, `src/location/`, `src/localization/` | Welcome flow, optional location/reminders, typed localized messages |
| `scripts/`, `tests/` | Asset generators, regression tests, released-data fixtures |

Reuse existing controls and helpers; keep derived data in ordinary functions. Lived counts as Visited, and setting home marks that country Lived. Country and region statuses are independent. Lists store catalog IDs; stamps and statistics derive from travel data. Cameras, filters, selections, and Undo are session-only.

UI and background tasks share `appData`. `index.js` registers the lightweight arrival task before Router; normal app imports stay deferred behind the root recovery boundary. Background checks may update reminder metadata, never travel statuses. Inactive maps stop rendering; geography is generated before bundling.

Keep UI text in `src/localization/locales/<language>/` and use typed `t` and shared formatters. A new language needs complete messages, plural/formatting data, geographic names, and matching native supported locales; verify Hermes support. English is the current fallback. Preserve 44-point targets, Dynamic Type, VoiceOver, Reduce Motion, and logical spacing. Never mirror geographic coordinates. Agent-specific rules live in [AGENTS.md](AGENTS.md).

## Data upgrades

The current app is the v1 baseline. Both saved data and backups use `{ app: "past-pins", schemaVersion: 1, data }`. Prototype formats are rejected. Once v1 reaches **TestFlight**, its contract is released: keep historical schemas, defaults, IDs, fixtures, and migrations unchanged.

| Version | When to change it |
| --- | --- |
| App version in `app.json` | Each public release |
| iOS build number | Each uploaded binary; use EAS remote auto-increment |
| Document `schemaVersion` | A stored field, default, validation rule, or ID needs conversion |

A UI fix does not need a data migration. To add schema 2:

1. Add `src/data/schemas/v2.ts` with its type, validator, and defaults. Historical validators must use their frozen ID sets, not today’s catalogs or localization.
2. Write a pure `upgradeV1ToV2(previous: unknown)` that preserves existing information and uses fixed defaults for added fields. No IO, clock, randomness, or prompts.
3. Append `{ version: 2, validate: validateV2, upgrade: upgradeV1ToV2 }` in [document.ts](src/data/document.ts). Update its output type and the current aliases in `model.ts` and `validation.ts`. Versions must be consecutive; storage and imports use this same decoder.
4. Add fixtures under `tests/fixtures/data/`. Keep every released input unchanged and test its explicit expected current result, including skipped releases. Cover invalid input/output, thrown migrations, future versions, transaction interruption, and repeated loads.
5. Run `bun run verify` and test an actual installed upgrade using the [release checks](#on-an-iphone).

`v1-empty.json` fixes the original defaults; `v1-populated.json` covers all persisted fields, mixed lists, Unicode, and nondefault preferences. `v1-ids.json` freezes accepted geographic identities. Catalog changes require auditing saved countries, regions, and list membership: explicitly migrate renamed/merged IDs, preserve unrepresentable information, or block the upgrade. Never silently drop it.

### Persistence and recovery

[snapshot-storage.ts](src/storage/snapshot-storage.ts) serializes all database access. Migration and confirmed restore save the original raw document plus its replacement in one `SQLiteStorage.multiSet` transaction, retaining the latest three recovery copies. Ordinary edits preserve those copies. Keep the adapter atomic; independent writes are not equivalent.

A failed load, migration, or future-version check preserves the saved document and opens recovery. A missing primary document with existing copies is an error. Ordinary edits publish immediately and offer Retry save on failure; unsaved edits can be lost on exit. Restore and reset operations publish only after persistence succeeds. Tests exercise real SQLite rollback and process interruption, but do not replace native-device checks.

| Action | Effect |
| --- | --- |
| Settings → Data and recovery | Raw saved-file export, backup import, copy restore, diagnostics, confirmed full reset |
| Clear travel | Removes countries, regions, lists, home, and recovery copies; keeps preferences and reminder history |
| Reset preferences | Keeps travel and copies; disables arrival reminders |
| Full reset | Clears app data, reminder history, diagnostics, temporary backups, and session state; returns to Welcome |
| iPhone Settings → Apps → PastPins → Reset on Next Launch | After force-quitting and reopening, deletes owned files before React Native starts |

External backup files and iOS permissions survive reset. A failed native deletion leaves the reset request pending and blocks app storage until a successful cold launch. Reset cannot repair a broken binary; local copies cannot protect against device loss. The root boundary handles render/import failures, not every native or asynchronous crash.

Add new persistent files to [owned-files.json](src/storage/owned-files.json) and implement/test both in-app and native reset handling. Arrival bookkeeping is separately versioned, excluded from backups, and rebuilt without sending a duplicate reminder when malformed; IO failures preserve it. Diagnostics retain at most 50 allowlisted events locally, with versions and codes only. Never log raw errors, travel records, or coordinates; sharing is explicit.

## Geography

World assets derive from `@rembish/iso-topojson`; regional assets use the immutable commit and checksum in [subdivisions-source.json](scripts/data/subdivisions-source.json). The [manifest](src/subdivisions/manifest.json) records coverage, source age, exclusions, and generated hashes. Do not hand-edit generated JSON or patch individual countries.

- `bun run generate` rebuilds map assets and license notices.
- `bun run subdivisions:refresh` redownloads and verifies the **same pinned source** before regenerating; it does not upgrade the source.
- `bun run subdivisions:check` verifies hashes offline. For reproducibility, regenerate from the pin and compare outputs.

To update the pin, review the upstream license and boundary policy, record its immutable commit/checksum/date, regenerate, audit removed/reassigned IDs and list references, and supply any required [migration](#data-upgrades). Check coverage and representative maps, including tiny islands and antimeridian countries. Refresh attribution and run `bun run verify`.

Regional IDs are `ne:<ne_id>`; names and ISO-style display codes are not unique identities. Natural Earth is a cartographic dataset with variable administrative levels, older boundaries, and partial coverage. Its [de facto boundary policy](https://www.naturalearthdata.com/about/disputed-boundaries-policy/) may differ from the ISO world map. Keep these limitations visible in About and retain [public attribution](README.md#credits).

## Release

Choose a permanent iOS bundle identifier and configure the EAS project, Apple team, and App Store Connect app before distributing builds. These account choices are intentionally not committed yet. Never commit signing credentials.

```sh
bunx eas-cli login
bunx eas-cli build:configure --platform ios
```

In the generated `eas.json`, set `cli.appVersionSource` to `"remote"` and `build.production.autoIncrement` to `true`. Keep `expo.version` in `app.json` current. For an existing uploaded app, initialize the remote build number with `bunx eas-cli build:version:set --platform ios`. See [Expo app versions](https://docs.expo.dev/build-reference/app-versions/).

For each candidate:

```sh
bun run verify
bunx eas-cli build --platform ios --profile production
bunx eas-cli submit --platform ios --profile production
```

Select the exact candidate build when submitting. [EAS Submit](https://docs.expo.dev/submit/ios/) uploads it to App Store Connect for TestFlight; it does not publish the app. Test that build, then select the same build for App Review and release.

### On an iPhone

- **Fresh install:** Welcome, skipping/accepting/denying permissions, offline editing, relaunch, export/import, and cancellation. Browsing must work without location access.
- **Upgrade:** Populate a prior build with countries, regions, home, mixed lists, and nondefault preferences. Export a backup, then install the candidate over it with the same bundle identifier. Verify every value and relaunch twice. Test skipped versions and old backups as schemas accumulate.
- **Failures:** In a development build, inject failed/interrupted writes, migration failure, invalid/future documents, corrupt recovery history, and render failure before providers mount. Confirm preserved data, safe errors, export, and retry. Test unavailable and near-full storage.
- **Native reset:** Enable the Settings switch, force-quit, reopen, and verify Welcome, cleared data/reminders/diagnostics, and the switch off. Test cancelling the request, deletion failure/retry, and a crash before JavaScript starts.
- **Interactions:** Maps and gestures, status/home/Undo, mixed lists, sharing, restore/reset, and arrival reminders. Leave and return during pending pickers, confirmations, or location requests; stale actions must not apply. Test notification taps from a cold launch, permission revocation, disabling reminders, and background battery behavior.
- **Accessibility:** Small iPhone, largest Dynamic Type, VoiceOver order/actions and announcements, long translations, and Reduce Motion. Check native sheets/pickers and exported image fidelity. JavaScript tests and bundle exports do not establish native correctness or frame rate.

For App Store updates, use a [phased release](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/) and monitor crash reports and feedback. Pause a bad rollout and ship a corrected **newer** build that reads every schema already written; do not downgrade data or erase it automatically. No OTA channel or remote error-reporting service is configured.
