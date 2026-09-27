# Development

[← PastPins](README.md)

[Run locally](#run-locally) · [Code](#code) · [Data upgrades](#data-upgrades) · [Currency metadata](#currency-metadata) · [Geography](#geography) · [Website](#website) · [Release an update](#release-an-update)

## Run locally

Use the Bun version in [package.json](package.json), Node.js 22.13+, and an iPhone. The app uses [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/).

```sh
bun install --frozen-lockfile
```

Build a development client when setting up or changing native code:

```sh
bunx eas-cli login
bunx eas-cli build --platform ios --profile development
```

Use the linked EAS project and install the build on your registered iPhone. Then start Metro:

```sh
bunx expo start --dev-client
```

Add `--tunnel` when needed, including on Linux.

| Build | Use |
| --- | --- |
| Development build | UI, background arrival reminders, and native Settings reset |
| TestFlight | The production candidate, including upgrades and native behavior |
| Expo Go: `bun run dev` | Quick UI checks through a tunnel |

Background reminders and native reset require a development or TestFlight build. The [EAS profiles](eas.json) share a pinned Bun version: `development` uses internal distribution; `production` uses App Store distribution.

### Everyday commands

| Command | Use |
| --- | --- |
| `bun run lint` / `bun run typecheck` | Lint and TypeScript checks |
| `bun test --watch` / `bun test document` | Focused tests |
| `bun run check` | Lint, types, test coverage, generated assets, and website build |
| `bun run verify` | Full pre-push and CI gate, including Expo Doctor and iOS exports |
| `bunx expo install <package>` | Add an Expo-compatible app dependency |
| `bun run generate` | Regenerate geography, currency funds, and license notices |
| `bun run deps:update` | Update dependencies, align Expo versions, regenerate, and verify |
| `bun run website:build` | Build the public pages in `_site/` |

Run lint and typecheck before finishing a task. Before every push, run `bun run verify` after the final edit, merge, or rebase and require exit code 0. GitHub Actions uses the same [verification script](scripts/verify.sh).

Typecheck generates Router types on a fresh checkout. `bun run` lists all scripts; the [Makefile](Makefile) supplies aliases.

### Native changes

- Read the matching SDK docs and [Expo’s index](https://docs.expo.dev/llms.txt) before changing Expo, EAS, or React Native APIs.
- Configure CNG through `app.json`, `app.config.ts`, and plugins. Never edit generated `ios/` files.
- Rebuild after native dependency, module, or configuration changes.
- After Worklets, Reanimated, or Babel changes, restart Metro with `bunx expo start --dev-client --clear`.

## Code

| Location | Responsibility |
| --- | --- |
| `src/app/`, `src/screens/`, `src/navigation/` | Router routes, screens, navigation, stale-action guards |
| `src/data/`, `src/storage/` | Shared store, mutations, versioned documents, serialized SQLite persistence |
| `src/recovery/`, `modules/past-pins-recovery/`, `plugins/with-recovery.js` | Recovery UI, diagnostics, native cold-launch reset |
| `src/atlas/`, `src/globe/`, `src/subdivisions/` | Map interaction, globe rendering, regional maps |
| `src/countries/`, `src/places/`, `src/lists/`, `src/stamps/`, `src/sharing/` | Catalogs, search, lists, stamps, sharing |
| `src/components/`, `src/theme.ts`, `src/feedback/`, `src/motion/` | Controls, styling, confirmations, toasts, Reduce Motion |
| `src/onboarding/`, `src/location/`, `src/localization/` | Welcome flow, optional location/reminders, localized text |
| `scripts/`, `tests/` | Generators, regression tests, data fixtures |

### App behavior

- Lived counts as Visited. Setting home marks that country Lived.
- Country and region statuses are independent. Lists store catalog IDs.
- Stamps and statistics derive from travel data.
- Cameras, filters, selections, and Undo last only for the session.
- Background checks update reminder metadata; travel changes require confirmation.

### State and rendering

- UI and background tasks share `appData`. Read with `useAppData(snapshot => snapshot.data.places)`; call actions on `appData`.
- Select primitives or existing immutable references. Derive arrays and objects with ordinary functions or `useMemo`.
- `AppDataEffects` loads the store and announces errors without rerendering travel views for save feedback.
- `useActionGuard` returns `guard`. Capture `const isCurrent = guard()` before asynchronous work, recheck it before applying results, and pass it to `setStatus` for pending home-change confirmations.
- `index.js` registers the arrival task before Router. App imports stay deferred behind the root recovery boundary.
- Inactive maps stop rendering. Flat maps, stamps, and picking use `src/atlas/metadata.json`; the globe loads vertex buffers from `src/globe/world.json` when its GL context is created.

### Localization and accessibility

Use typed `t` and shared formatters for UI text in `src/localization/locales/<language>/`. Follow the [localization and accessibility rules](AGENTS.md#localization-and-accessibility) when changing UI or adding a language, then run the [iPhone checks](#on-an-iphone).

## Data upgrades

The released v1 saved-file and backup format is `{ app: "past-pins", schemaVersion: 1, data }`. Preserve every format distributed through TestFlight or the App Store. Saved documents and imported backups use the same strict decoder.

The [model](src/data/model.ts) defines defaults, [validation](src/data/validation.ts) checks catalogs, and [document.ts](src/data/document.ts) encodes and decodes documents.

App and schema versions are independent. When stored fields, defaults, validation rules, or IDs need conversion:

1. Keep released fixtures in `tests/fixtures/data/` unchanged, including `v1-empty.json` and `v1-populated.json`.
2. Increment the schema version, add new fixtures, and add a pure forward migration through the shared decoder.
3. Preserve travel statuses, home, list membership, and preferences. Audit geographic ID changes before updating catalogs.
4. Test every released schema’s path to the new format, including old backup imports, repeated loads, failed saves, interrupted writes, and stale asynchronous actions.
5. Run the [upgrade checks on an iPhone](#on-an-iphone).

Preserve unknown, future, and corrupt documents for explicit recovery. Never silently reset data or discard unknown IDs to make a load succeed.

### Persistence and recovery

[snapshot-storage.ts](src/storage/snapshot-storage.ts) serializes database access. A restore saves the original raw document and its replacement in one atomic `SQLiteStorage.multiSet` transaction.

The app retains the latest three recovery copies. Ordinary edits preserve them.

| Operation | Failure behavior |
| --- | --- |
| Load | Preserve the document and open recovery. A missing primary document with existing copies is also an error. |
| Ordinary edit | Publish immediately; offer Retry save if persistence fails. Unsaved edits can be lost on exit. |
| Restore or reset | Publish only after persistence succeeds. |

Tests cover SQLite rollback and process interruption. Native recovery changes require a new build and physical iPhone checks.

### Reset controls

| Action | Effect |
| --- | --- |
| Settings → Data and recovery | Raw saved-file export, backup import, copy restore, diagnostics, confirmed full reset |
| Clear travel | Removes countries, regions, lists, home, and recovery copies; keeps preferences and reminder history |
| Reset preferences | Keeps travel and copies; disables arrival reminders |
| Full reset | Clears app data, reminder history, diagnostics, temporary backups, and session state; returns to Welcome |
| iPhone Settings → Apps → PastPins → Reset on Next Launch | After force-quitting and reopening, deletes owned files before React Native starts |

External backups and iOS permissions survive reset. Failed native deletion keeps the request pending and blocks storage until a successful cold launch.

Local copies cannot protect against device loss, and reset cannot repair a broken binary. The root boundary catches render/import failures, not all native or asynchronous crashes.

### Adding storage

- Define backup and reset behavior for each new app-owned store.
- Register new owned files in [owned-files.json](src/storage/owned-files.json). Test in-app and native reset handling.
- Keep arrival bookkeeping separately versioned and excluded from backups. Malformed bookkeeping rebuilds without duplicate reminders; I/O failures preserve it.
- Keep diagnostics local and bounded to 50 allowlisted events with versions and codes. Exclude raw errors, travel records, and coordinates. Sharing requires an explicit action.

## Currency metadata

Country currencies come from `countries-list`. The shared catalog excludes codes marked `IsFund="true"` in [SIX's ISO 4217 list](https://www.six-group.com/en/products-services/financial-information/market-reference-data/data-standards.html). This removes financial funds and accounting units while preserving multiple currencies and their upstream order. It does not determine how commonly a currency is used by travelers.

`bun run currencies:refresh` downloads the current XML, validates it, and updates both [the source snapshot](scripts/data/currencies.xml) and [the generated fund codes](src/countries/fund-codes.json). Review and commit both files. `bun run currencies:generate` regenerates from the snapshot; `bun run currencies:check` verifies it offline as part of the shared check command. The app bundles only the generated JSON and makes no currency network requests. Currency filtering changes display metadata only, not geographic IDs, saved visits, or backups.

Refresh rejects invalid downloads and older publication dates before writing, and reports added/removed fund codes for review. Dependency updates regenerate the saved snapshot; they do not fetch new currency data. After a refresh, review the source date and code changes and run `bun run verify`. If generation is interrupted after updating the XML, rerun `bun run currencies:generate` to rebuild its JSON before verification.

## Geography

World assets derive from `@rembish/iso-topojson`. Regional assets use the immutable commit and checksum in [subdivisions-source.json](scripts/data/subdivisions-source.json). The [manifest](src/subdivisions/manifest.json) records coverage, source age, exclusions, and generated hashes.

| Command | Effect |
| --- | --- |
| `bun run generate` | Rebuild maps, currency funds, and license notices |
| `bun run subdivisions:refresh` | Redownload and verify the same pinned source, then regenerate |
| `bun run subdivisions:check` | Verify generated hashes offline |

Do not hand-edit generated JSON or patch individual countries. To update the source:

1. Review its license and boundary policy; record the immutable commit, checksum, and date.
2. Audit removed/reassigned IDs and list references. Add any required [migration](#data-upgrades).
3. Regenerate and compare outputs. Check coverage, tiny islands, and antimeridian countries.
4. Refresh attribution and run `bun run verify`.

Regional IDs are `ne:<ne_id>`; names and display codes are not identities. Natural Earth has variable administrative levels, older boundaries, and partial coverage. Its [de facto boundary policy](https://www.naturalearthdata.com/about/disputed-boundaries-policy/) may differ from the ISO world map. Keep these limitations in About and preserve [attribution](README.md#credits).

## Website

The website uses plain HTML and CSS. [build.ts](website/build.ts) fills localized placeholders and writes three pages to the ignored `_site/` directory, outside Expo’s `dist/`.

| Change | File |
| --- | --- |
| Page text | [website.json](src/localization/locales/en/website.json) |
| Layout and links | [Home](website/index.html), [Privacy](website/privacy/index.html), [Support](website/support/index.html) |
| Appearance | [styles.css](website/styles.css) |

Build with `bun run website:build` and verify before pushing. [GitHub Actions](.github/workflows/check.yml) deploys `main` to GitHub Pages; pull requests only verify. Keep the `/past-pins/` base path and check the live pages after deployment.

| App Store Connect field | Public page |
| --- | --- |
| Marketing URL | [Home](https://kkd16.github.io/past-pins/) |
| Privacy Policy URL | [Privacy](https://kkd16.github.io/past-pins/privacy/) |
| Support URL | [Support](https://kkd16.github.io/past-pins/support/) |

Privacy and Support also appear in Settings → About. Keep these pages and store metadata consistent with the shipped app.

## Release an update

Use the existing EAS project, Apple team, and App Store Connect record for `io.github.kkd16.pastpins`. Never commit signing credentials.

### Prepare the version

1. Set the next `expo.version` in `app.json`. Match `package.json` with `bun pm pkg set version=1.0.1`, replacing the example version as needed.
2. Complete any [data upgrades](#data-upgrades) and regression coverage.
3. Run `bun run licenses:generate` and review [source and license obligations](#source-and-license-obligations).
4. Run `bun run verify`, then commit the candidate. Rerun verification after any edit, merge, or rebase.

[EAS](eas.json) increments the iOS build number for each production build. Set the public app version yourself for each release. See [Expo’s version guide](https://docs.expo.dev/build-reference/app-versions/).

### Build and test

```sh
bunx eas-cli build --platform ios --profile production
```

1. Record the successful EAS build ID, iOS build number, app version, and source commit.
2. Check the build against [Apple’s current requirements](https://developer.apple.com/news/upcoming-requirements/). Inspect the `.ipa` for identity/version, iPhone targeting, icon, reset settings, background modes, network security, and privacy manifests/signatures.
3. Publish its source before distribution, following the [source release checklist](#source-and-license-obligations).
4. Upload that build, replacing `BUILD_ID` below:

```sh
bunx eas-cli submit --platform ios --profile production --id BUILD_ID
```

[EAS Submit](https://docs.expo.dev/submit/ios/) uploads to TestFlight. Resolve processing or compliance questions, install the candidate, and run the [iPhone checks](#on-an-iphone). After fixes, verify, rebuild, upload, and retest.

### Submit and monitor

1. [Create a new iOS version](https://developer.apple.com/help/app-store-connect/update-your-app/create-a-new-version/) in the existing app record, matching `expo.version`.
2. Add What’s New, refresh changed screenshots and metadata, and check the public URLs. Review privacy disclosures, age rating, export compliance, agreements, and regional requirements against the candidate.
3. Select the exact tested build. Update reviewer contact details and notes for optional permissions, arrival reminders, backups, and recovery; sign-in is not required.
4. Choose the release timing and [phased rollout](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/), then submit for App Review.
5. After approval, release as scheduled. Check the public listing, crash reports, and support feedback.

Review [App Privacy disclosures](https://developer.apple.com/app-store/app-privacy-details/) when SDKs, services, or support practices change. The app has no developer backend, analytics, ads, or automatic diagnostics upload.

If a rollout causes problems, pause it and ship a corrected **newer** version that reads every schema already written. Never downgrade or erase user data. No OTA channel or remote error-reporting service is configured.

### Source and license obligations

For every distributed build, including TestFlight:

- Include the generated [GPL](LICENSE), [App Store permission](COPYING.iOS), copyright, and third-party notices.
- Tag and retain the exact source revision. Publish complete corresponding source, required dependency source, and build scripts/instructions.
- Link the source release in the release notes and provide recipients access alongside the binary, using a method permitted by GPL section 6. A moving `main` link is insufficient.
- Check distribution rights and exclude credentials from published files. The App Store permission preserves GPL obligations and does not extend to third-party GPL-only code.

### On an iPhone

Record the device, iOS version, candidate build, and results. Use disposable data for destructive checks and a development build for failure injection.

| Check | Verify |
| --- | --- |
| Fresh install | Welcome; skip, accept, or deny permissions; browse without location; edit offline; relaunch; export/import and cancel |
| Upgrade | Populate the released app with countries, regions, home, mixed lists, and nondefault preferences. Export a backup, install the candidate over it, verify every value, and relaunch twice. |
| Older versions | Upgrade across skipped versions and import backups from every released schema. |
| Storage failures | Failed/interrupted writes, invalid imports, future/corrupt documents, corrupt recovery history, unavailable or near-full storage. Data survives; recovery, export, and retry work. |
| Startup and reset | Render failure before providers mount; native reset before JavaScript starts; cancel reset; deletion failure/retry. Successful reset returns to Welcome, clears data/reminders/diagnostics, and turns the switch off. |
| Interactions | Maps, gestures, status/home/Undo, mixed lists, sharing, restore/reset. Leave and return during pickers, confirmations, and location requests; stale actions must not apply. |
| Arrival reminders | Background delivery, cold-launch notification taps, permission revocation, disabling reminders, battery and thermal behavior |
| Accessibility | Small iPhone, largest Dynamic Type, VoiceOver order/actions and announcements, long translations, supported locale/RTL behavior, Reduce Motion, native sheets/pickers |
| Network and images | Location lookup and external links on IPv6-only networks; exported image fidelity |

JavaScript tests and exports do not establish native correctness or frame rate. Report any device checks that could not be run.
