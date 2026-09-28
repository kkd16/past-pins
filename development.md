# Development

[← PastPins](README.md)

[Run locally](#run-locally) · [Code](#code) · [Data format](#data-format) · [Currency metadata](#currency-metadata) · [Geography](#geography) · [Website](#website) · [Release an update](#release-an-update)

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
- Countries, regions, and cities share one status map. Child visits promote source-linked parents; lists store catalog IDs.
- Stamps and statistics derive from travel data.
- Cameras, filters, and selections last only for the session.
- Places and list editing share a location picker. Choosing a country or region applies immediately; changing place type keeps the nearest supported parent. Status filters stay visible as wrapping chips. The list editor's Selected view shows the complete draft, independently of browse filters.
- Search ranks names ahead of aliases and geographic context. SQLite applies filters before pagination. When there is no strong match, Fuse.js scores up to 100 indexed city candidates and the eligible country/region names to offer three suggestions. The bundled catalog includes the suggestion index; searches never load the full city catalog into JavaScript.
- Background checks update reminder metadata; travel changes require confirmation.

### State and rendering

- UI and background tasks share `appData`. Read with `useAppData(snapshot => snapshot.data.places)`; call actions on `appData`.
- Select primitives or existing immutable references. Derive arrays and objects with ordinary functions or `useMemo`.
- `AppDataEffects` loads the store and announces errors without rerendering travel views for save feedback.
- `useActionGuard` returns `guard`. Capture `const isCurrent = guard()` before asynchronous work, recheck it before applying results, and pass it to `setStatus` for pending status-change confirmations.
- `index.js` registers the arrival task before Router. App imports stay deferred behind the root recovery boundary.
- Inactive maps stop rendering. Flat maps, stamps, and picking use `src/atlas/metadata.json`; the globe loads vertex buffers from `src/globe/world.json` when its GL context is created.

### Localization and accessibility

Use typed `t` and shared formatters for UI text in `src/localization/locales/<language>/`. Follow the [localization and accessibility rules](AGENTS.md#localization-and-accessibility) when changing UI or adding a language, then run the [iPhone checks](#on-an-iphone).

## Data format

The app is unreleased. The v1 saved-file and backup format is `{ app: "past-pins", schemaVersion: 1, data }`, with one `places` status map for countries, regions, and cities. There are no older formats or migrations. Current fixtures describe the v1 format and may be updated before release.

The [model](src/data/model.ts) defines defaults and status transitions, [validation](src/data/validation.ts) checks catalog IDs and hierarchy, and [document.ts](src/data/document.ts) provides the strict decoder shared by storage and imports.

Visited and lived places promote their source-linked ancestors. Removing a child leaves parent history intact. Lowering a parent clears or downgrades contained visits after a single confirmation that also covers clearing the current home. Wishlists and list membership remain independent. Every change publishes and saves one complete snapshot.

Preserve unknown, future, and corrupt documents for explicit recovery. Never silently reset data or discard unknown IDs to make a load succeed. Once a format ships through TestFlight or the App Store, preserve its data contract and fixtures; app and schema versions are independent.

### Persistence and recovery

[document-storage.ts](src/storage/document-storage.ts) serializes database access. Edits and confirmed backup imports replace the single current document with an atomic `SQLiteStorage.setItem` write. Export a backup before importing if you want to keep the current data.

| Operation | Failure behavior |
| --- | --- |
| Load | Preserve the document and open recovery. |
| Ordinary edit | Publish immediately; offer Retry save if persistence fails. Unsaved edits can be lost on exit. |
| Restore or reset | Publish only after persistence succeeds. |

Tests cover SQLite rollback and process interruption. Native recovery changes require a new build and physical iPhone checks.

### Reset controls

| Action | Effect |
| --- | --- |
| Settings → Your saved data | Raw saved-file export, backup import, diagnostics, confirmed full reset |
| Clear travel | Removes countries, regions, cities, lists, and home; keeps preferences and reminder history |
| Reset preferences | Keeps travel; disables arrival reminders |
| Full reset | Clears app data, reminder history, diagnostics, temporary backups, and session state; returns to Welcome |
| iPhone Settings → Apps → PastPins → Reset on Next Launch | After force-quitting and reopening, deletes owned files before React Native starts |

External backups and iOS permissions survive reset. Failed native deletion keeps the request pending and blocks storage until a successful cold launch.

Reset cannot repair a broken binary. The root boundary catches render/import failures, not all native or asynchronous crashes.

### Adding storage

- Define backup and reset behavior for each new app-owned store.
- Register new owned files in [owned-files.json](src/storage/owned-files.json). Test in-app and native reset handling.
- Keep arrival bookkeeping separately versioned and excluded from backups. Malformed bookkeeping rebuilds without duplicate reminders; I/O failures preserve it.
- Keep diagnostics local and bounded to 50 allowlisted events with versions and codes. Catalog failures use a generic `catalog` event. Never log raw errors, searches, travel records, coordinates, device names, or unique identifiers.
- All support emails use one consent and draft flow. Error and bug reports include app/build version, device make/model, and iOS version; only error reports read the log. Feature requests include only writing prompts. Consent explains what is shared, including the sender's name and email address. Device details are read only when needed after consent. A standard `mailto:` link opens the iPhone’s default email app with an encoded subject and body; the app cannot observe whether the user sends the draft. No report files are created and nothing sends automatically.

## Currency metadata

Country currencies come from `countries-list`. The shared catalog excludes codes marked `IsFund="true"` in [SIX's ISO 4217 list](https://www.six-group.com/en/products-services/financial-information/market-reference-data/data-standards.html). This removes financial funds and accounting units while preserving multiple currencies and their upstream order. It does not determine how commonly a currency is used by travelers.

`bun run currencies:refresh` downloads the current XML, validates it, and updates both [the source snapshot](scripts/data/currencies.xml) and [the generated fund codes](src/countries/fund-codes.json). Review and commit both files. `bun run currencies:generate` regenerates from the snapshot; `bun run currencies:check` verifies it offline as part of the shared check command. The app bundles only the generated JSON and makes no currency network requests. Currency filtering changes display metadata only, not geographic IDs, saved visits, or backups.

Refresh parses and validates fund codes before writing. Dependency updates regenerate the saved snapshot; they do not fetch new currency data. After a refresh, review the source date and code changes in `git diff` and run `bun run verify`. If generation is interrupted after updating the XML, rerun `bun run currencies:generate` to rebuild its JSON before verification.

## Geography

World assets derive from `@rembish/iso-topojson`. Regional assets use the immutable commit and checksum in [subdivisions-source.json](scripts/data/subdivisions-source.json). The [manifest](src/subdivisions/manifest.json) records coverage, source age, exclusions, and generated hashes.

| Command | Effect |
| --- | --- |
| `bun run generate` | Rebuild geographic catalogs, maps, currency funds, and license notices |
| `bun run subdivisions:refresh` | Redownload and verify the same pinned source, then regenerate |
| `bun run subdivisions:check` | Verify generated hashes offline |
| `bun run cities:generate` | Rebuild the offline city database and parent index from saved source snapshots |
| `bun run cities:refresh` | Download current GeoNames snapshots, verify the pinned boundaries, and regenerate |
| `bun run cities:check` | Verify source snapshots, generator inputs, and generated hashes offline |

Do not hand-edit generated JSON or patch individual countries. To update the source:

1. Review its license and boundary policy; record the immutable commit, checksum, and date.
2. Audit removed/reassigned IDs and list references. Review the [data contract](#data-format).
3. Regenerate and compare outputs. Check coverage, tiny islands, and antimeridian countries.
4. Refresh attribution and run `bun run verify`.

Regional IDs are `ne:<ne_id>`; names and display codes are not identities. Natural Earth has variable administrative levels, older boundaries, and partial coverage. Its [de facto boundary policy](https://www.naturalearthdata.com/about/disputed-boundaries-policy/) may differ from the ISO world map. Keep these limitations in About and preserve [attribution](README.md#credits).

The city database is public, read-only reference data. Backups store only city IDs and statuses, never a duplicate catalog. In-app resets retain its cache because it contains no user data; catalog retry deletes the cached file and imports the bundled asset again. Native Reset on Next Launch removes the directory registered as `catalogDirectory` in `owned-files.json` before React Native starts. A new iPhone build and physical cold-launch/reset check are required to validate this native ownership and catalog retry.

Cities and towns come from GeoNames cities500 and are bundled for offline use. Source URLs, dates, licenses, and checksums are recorded in [cities-source.json](scripts/data/cities-source.json); compressed snapshots live in `scripts/data/cities/`. Review refreshed sources and generated assets together. IDs are `city:<geonameid>`. The catalog excludes neighborhoods, historical or abandoned settlements, and other non-settlement feature types. Search uses the bundled SQLite catalog; a compact parent index validates IDs and links statuses without loading every city into React state.

Source refresh downloads and validates every snapshot and builds the database before replacing saved sources or generated assets. Download and validation failures preserve the existing snapshot set. City search keeps Unicode combining marks within words and uses the source's alternative names. Browsing uses SQLite indexes and bounded pages.

Region links use source GeoNames administrative IDs and unique same-country containment in the pinned Natural Earth boundaries. Cities without a reliable region link still track their country. Never add hand-authored city records, aliases, parent links, or geographic overrides.

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
2. Review the [data contract](#data-format) and complete regression coverage.
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
| Saved data | Populate the candidate with countries, regions, cities, home, mixed lists, and nondefault preferences. Relaunch twice, then export, reset, import, and verify every value. |
| Documents | Round-trip the v1 fixtures and city lists; reject malformed, inconsistent, and unknown-place backups without altering saved data. |
| Storage failures | Failed/interrupted writes, invalid imports, future/corrupt documents, unavailable or near-full storage. Data survives; recovery, export, and retry work. |
| Support emails | On a physical iPhone, test error reports and both Settings → Support actions: consent/cancel, leave the screen during consent, switch the default between Apple Mail and other installed email apps, test without an email app, and verify complete draft contents with a full 50-event log, then cancel/save/send. Error reports include the sanitized log, bug reports include basic app/device details only, and feature requests include no diagnostics. Rebuild after native dependency changes; JavaScript tests cannot verify another app’s handling of email links. |
| Startup and reset | Render failure before providers mount; native reset before JavaScript starts; cancel reset; deletion failure/retry. Successful reset returns to Welcome, clears data/reminders/diagnostics, and turns the switch off. |
| Interactions | Maps, gestures, status/home, mixed lists, sharing, restore/reset. Leave and return during pickers, confirmations, and location requests; stale actions must not apply. |
| Arrival reminders | Background delivery, cold-launch notification taps, permission revocation, disabling reminders, battery and thermal behavior |
| Accessibility | Small iPhone, largest Dynamic Type, VoiceOver order/actions and announcements, long translations, supported locale/RTL behavior, Reduce Motion, native sheets/pickers |
| Network and images | Location lookup and external links on IPv6-only networks; exported image fidelity |

JavaScript tests and exports do not establish native correctness or frame rate. Report any device checks that could not be run.
