# Development

[← PastPins](README.md)

[Run locally](#run-locally) · [Code](#code) · [Data upgrades](#data-upgrades) · [Geography](#geography) · [Website](#website) · [Release](#release)

## Run locally

Use the Bun version in [package.json](package.json), Node.js 22.13+, and an iPhone. The app uses Expo SDK 57 and intentionally sets `ios.supportsTablet` to `false`.

```sh
bun install --frozen-lockfile
bun run ios
```

On Linux, use `bun run dev` for a tunnel and open it in Expo Go on an iPhone.

| Build | What you can check |
| --- | --- |
| Expo Go | Main UI and JavaScript behavior |
| Installed development or TestFlight build | Background arrival monitoring and native Settings reset |

For a development client:

1. Install `expo-dev-client` with `bunx expo install expo-dev-client`.
2. Configure EAS under [Release](#release).
3. Run `bunx eas-cli build --platform ios --profile development`.

### Everyday commands

| Command | Use |
| --- | --- |
| `bun run check` | Lint, typecheck, tests with coverage, generated-asset checks |
| `bun run verify` | Full pre-push/CI gate, including Expo Doctor and both iOS exports |
| `bun test --watch` or `bun test backup` | Focused test iteration |
| `bunx expo install <package>` | Install an Expo-compatible app dependency |
| `bun run generate` | Regenerate geography and third-party notices |
| `bun run website:build` | Build the three static GitHub Pages pages in `_site/` |
| `bun run deps:update` | Update dependencies, align Expo versions, regenerate, verify |

Run `bun run verify` before every push, after the final edit or rebase. GitHub Actions invokes the same [scripts/verify.sh](scripts/verify.sh); keep the check list there. Typecheck refreshes Router’s generated types, so it works on a fresh checkout. Coverage measures loaded JavaScript, not native behavior.

### Native changes

- Read Expo’s matching versioned docs before changing native APIs.
- Rebuild after native dependency, module, or configuration changes.
- Configure CNG through `app.config.ts` and plugins; do not edit generated `ios/` files.
- After Worklets/Reanimated/Babel updates, restart Metro with `bun run dev --clear`.

`bun run` lists the remaining scripts; the Makefile only supplies aliases.

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

### Data and rendering

- Reuse existing controls and helpers; keep derived data in ordinary functions.
- Lived counts as Visited. Setting home marks that country Lived.
- Country and region statuses are independent. Lists store catalog IDs.
- Stamps and statistics derive from travel data.
- Cameras, filters, selections, and Undo are session-only.

UI and background tasks share `appData`. `index.js` registers the lightweight arrival task before Router; normal app imports stay deferred behind the root recovery boundary. Background checks may update reminder metadata, never travel statuses. Inactive maps stop rendering; geography is generated before bundling.

### Localization and accessibility

- Put UI text in `src/localization/locales/<language>/`; use typed `t` and shared formatters.
- A new language needs complete messages, plural/formatting data, geographic names, native supported locales, and verified Hermes support. English is the fallback.
- Preserve 44-point targets, Dynamic Type, VoiceOver, Reduce Motion, and logical spacing.
- Never mirror geographic coordinates.

Agent-specific rules live in [AGENTS.md](AGENTS.md).

## Data upgrades

The current app is the v1 baseline. Both saved data and backups use `{ app: "past-pins", schemaVersion: 1, data }`. Prototype formats are rejected. Once v1 reaches **TestFlight**, its contract is released: keep historical schemas, defaults, IDs, fixtures, and migrations unchanged.

| Version | When to change it |
| --- | --- |
| App version in `app.json` | Each public release |
| iOS build number | Each uploaded binary; use EAS remote auto-increment |
| Document `schemaVersion` | A stored field, default, validation rule, or ID needs conversion |

### Adding a schema version

A UI fix does not need a migration. To add schema 2:

1. Add `src/data/schemas/v2.ts` with its type, validator, and defaults. Historical validators must use their frozen ID sets, not today’s catalogs or localization.
2. Write a pure `upgradeV1ToV2(previous: unknown)` that preserves existing information and uses fixed defaults for added fields. No IO, clock, randomness, or prompts.
3. Append `{ version: 2, validate: validateV2, upgrade: upgradeV1ToV2 }` in [document.ts](src/data/document.ts). Update its output type and the current aliases in `model.ts` and `validation.ts`. Versions must be consecutive; storage and imports use this same decoder.
4. Add fixtures under `tests/fixtures/data/`. Keep every released input unchanged and test its explicit expected current result, including skipped releases. Cover invalid input/output, thrown migrations, future versions, transaction interruption, and repeated loads.
5. Run `bun run verify` and test an actual installed upgrade using the [release checks](#on-an-iphone).

### Historical fixtures

| Fixture | Contract |
| --- | --- |
| `v1-empty.json` | Original defaults |
| `v1-populated.json` | All persisted fields, mixed lists, Unicode, nondefault preferences |
| `v1-ids.json` | Accepted geographic identities |

Before catalog changes, audit saved countries, regions, and list membership.
Migrate renamed/merged IDs, preserve unrepresentable information, or block the
upgrade. Never silently drop it.

### Persistence and recovery

[snapshot-storage.ts](src/storage/snapshot-storage.ts) serializes all database access. Migration and confirmed restore save the original raw document plus its replacement in one `SQLiteStorage.multiSet` transaction, retaining the latest three recovery copies. Ordinary edits preserve those copies. Keep the adapter atomic; independent writes are not equivalent.

| Operation | Failure behavior |
| --- | --- |
| Load or migration | Preserve the saved document and open recovery, including for future versions. A missing primary document with existing copies is an error. |
| Ordinary edit | Publish immediately; offer Retry save on failure. Unsaved edits can be lost on exit. |
| Restore or reset | Publish only after persistence succeeds. |

Tests exercise real SQLite rollback and process interruption; native-device
checks are still required.

### Reset controls

| Action | Effect |
| --- | --- |
| Settings → Data and recovery | Raw saved-file export, backup import, copy restore, diagnostics, confirmed full reset |
| Clear travel | Removes countries, regions, lists, home, and recovery copies; keeps preferences and reminder history |
| Reset preferences | Keeps travel and copies; disables arrival reminders |
| Full reset | Clears app data, reminder history, diagnostics, temporary backups, and session state; returns to Welcome |
| iPhone Settings → Apps → PastPins → Reset on Next Launch | After force-quitting and reopening, deletes owned files before React Native starts |

External backup files and iOS permissions survive reset. A failed native deletion leaves the reset request pending and blocks app storage until a successful cold launch. Reset cannot repair a broken binary; local copies cannot protect against device loss. The root boundary handles render/import failures, not every native or asynchronous crash.

### Adding persistent storage

- Register new files in [owned-files.json](src/storage/owned-files.json) and test both in-app and native reset handling.
- Keep arrival bookkeeping separately versioned and excluded from backups. Malformed bookkeeping rebuilds without duplicate reminders; IO failures preserve it.
- Keep diagnostics local and bounded to 50 allowlisted events with versions and codes. Never log raw errors, travel records, or coordinates. Sharing must be explicit.

## Geography

World assets derive from `@rembish/iso-topojson`; regional assets use the immutable commit and checksum in [subdivisions-source.json](scripts/data/subdivisions-source.json). The [manifest](src/subdivisions/manifest.json) records coverage, source age, exclusions, and generated hashes. Do not hand-edit generated JSON or patch individual countries.

- `bun run generate` rebuilds map assets and license notices.
- `bun run subdivisions:refresh` redownloads and verifies the **same pinned source** before regenerating; it does not upgrade the source.
- `bun run subdivisions:check` verifies hashes offline. For reproducibility, regenerate from the pin and compare outputs.

### Updating geography

1. Review the upstream license and boundary policy.
2. Record the immutable source commit, checksum, and date; regenerate assets.
3. Audit removed/reassigned IDs and list references; add any required [migration](#data-upgrades).
4. Check coverage and representative maps, including tiny islands and antimeridian countries.
5. Refresh attribution and run `bun run verify`.

Regional IDs are `ne:<ne_id>`; names and ISO-style display codes are not unique identities. Natural Earth is a cartographic dataset with variable administrative levels, older boundaries, and partial coverage. Its [de facto boundary policy](https://www.naturalearthdata.com/about/disputed-boundaries-policy/) may differ from the ISO world map. Keep these limitations visible in About and retain [public attribution](README.md#credits).

## Website

The website builds to plain HTML and CSS, with no browser scripts or new dependencies.

| To change… | Edit |
| --- | --- |
| Page text | [website.json](src/localization/locales/en/website.json) |
| Layout and links | [Home](website/index.html), [Privacy](website/privacy/index.html), [Support](website/support/index.html) |
| Appearance | [website/styles.css](website/styles.css) |

Each page is an explicit HTML template. [build.ts](website/build.ts) replaces
message placeholders with localized text and copies the CSS into `_site/`.

### Build and deploy

1. Run `bun run website:build` to generate `_site/`.
2. Run `bun run verify` after your final edit.
3. Push to `main`. [GitHub Actions](.github/workflows/check.yml) verifies, uploads `_site/`, and deploys to the `github-pages` environment.
4. Check all three live URLs below.

GitHub Settings → Pages must use **GitHub Actions** as its source. Pull requests
verify without deploying. The `/past-pins/` base path matches this repository.
Generated `_site/` files are ignored by Git and kept outside Expo's `dist/`.

### App Store Connect URLs

| App Store Connect field | URL |
| --- | --- |
| Marketing URL | `https://kkd16.github.io/past-pins/` |
| Privacy Policy URL | `https://kkd16.github.io/past-pins/privacy/` |
| Support URL | `https://kkd16.github.io/past-pins/support/` |

Privacy and Support are also linked from Settings → About. Apple requires an
accessible privacy policy in the app and its metadata; see the
[App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage).

## Release

### App Store readiness

- [ ] Check the three public URLs and support contact details.
- [ ] Update the website's availability text when the app is released.
- [ ] Review the policy against the submitted build, SDKs, and enabled services.
- [ ] Complete App Store Connect privacy disclosures, age rating, export compliance, review contact details, screenshots, and applicable regional trader declarations.
- [ ] Complete the source/license and iPhone checks below.

The current app has no developer backend, analytics, ads, or automatic diagnostics
upload. On-device processing alone is not App Store Connect data collection.
Check [Apple's definitions and optional-disclosure rules](https://developer.apple.com/app-store/app-privacy-details/)
for native services and optional support. Reassess when data practices change.

### Source and license obligations

For every distributed build:

- [ ] Align the `package.json` and `app.json` versions.
- [ ] Run `bun run licenses:generate` to bundle the [GPL](LICENSE), [App Store permission](COPYING.iOS), copyright, and third-party notices in the app.
- [ ] Tag and retain the exact source revision.
- [ ] Publish its complete corresponding source, required dependency source, and build scripts/instructions. A moving `main` link is insufficient.
- [ ] Link that source release from the release notes and provide access to recipients alongside the binary, using a method permitted by GPL section 6.
- [ ] Check dependency licenses and contributor rights. Exclude signing keys and credentials from published files.

The exception preserves GPL source obligations and cannot grant permissions
for third-party GPL-only code. Obtain software-licensing legal review before
App Store release if the distribution arrangement is uncertain. This setup
cannot guarantee App Review approval or legal compliance.

### Build and submit

The iOS bundle identifier is `io.github.kkd16.pastpins`, configured in [app.json](app.json). Confirm its availability when registering the App ID, then use the same identifier for the Apple team, signing configuration, and App Store Connect app. EAS project setup and Apple registration remain pending. Never commit signing credentials.

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
