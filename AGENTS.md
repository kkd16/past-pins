This is an intentionally iPhone-only Expo/React Native mobile application. Prioritize performance, accessibility, and native iOS conventions.

iPad is unsupported by design. Keep `ios.supportsTablet` set to `false`. Do not add iPad-specific layouts or workarounds, or support for other devices or platforms, unless the user explicitly changes this scope.

## Keep changes simple

- Prefer native iOS controls and documented Expo, React Native, and library defaults. Reuse existing helpers before adding dependencies, wrappers, or custom state.
- Fix demonstrated problems at their source. Explain the reason for each behavior change, add regression coverage for data and async failures where practical, and report native checks that could not be run.
- Keep code free of comments. Put architectural explanations and development guidance in documentation.

## Command-first project changes

- Use the project or framework CLI whenever an appropriate command exists for package management, scaffolding, configuration, or validation.
- This project uses Bun. Prefer `bunx` for package executables and Expo commands.
- Never hand-edit a lockfile. Dependency changes must be made through `bunx expo install` or the active package manager so `bun.lock` is updated by the command.
- Use `bun pm pkg` for supported `package.json` metadata changes instead of editing those fields manually.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use Bun commands in this repository (`bun.lock` is present).

```bash
bunx expo install <package>
bunx expo start --ios
bunx expo lint
bunx tsc --noEmit
bunx expo-doctor
bunx expo install --fix
```

Run lint and typecheck before declaring any task done.

## Required verification before pushing

- Before every push, run `bun run verify` from the repository root on the final changes and require exit code 0. Rerun it after any subsequent edits, merge, or rebase.
- Do not push if verification fails or cannot complete. Fix the issue and rerun the full gate; individual checks or an earlier CI result do not replace it. Do not skip checks or suppress failures.
- GitHub Actions must call the same `bun run verify` command. Keep the shared flow in `scripts/verify.sh` and the package scripts it invokes; do not duplicate its check list in workflow YAML or another runner.

## Data and release status

- The app is unreleased and has no users. Update the current schema, defaults, IDs, routes, and fixtures directly when needed. Remove obsolete paths; do not retain or add backwards-compatibility shims, legacy parsers, aliases, or migrations for unreleased formats. Follow [development.md](development.md) for recovery and the TestFlight → App Store release process.
- Saved documents and imported backups must use the same decoder. Once builds are distributed to testers or users, preserve their released contracts and add forward migrations for subsequent data changes.
- Preserve unknown/future or corrupt user documents until an explicit recovery action. Never silently clear data or drop unknown geographic IDs. Audit stored IDs and list membership before catalog changes.
- Preserve the atomic checkpoint-plus-document transaction and the serialized storage queue. Cover import failures, interrupted transactions, repeated loads, and stale asynchronous actions when changing persistence. Add migration coverage when a released format actually needs upgrading.
- New app-owned storage needs an explicit backup/reset policy, native cold-reset ownership when relevant, and regression coverage. Diagnostics must remain bounded, local, and free of raw errors or user data.
- Native recovery changes require a new iPhone build and physical-device cold-launch/reset checks; Expo Go and JavaScript tests cannot validate the safeguard.

## Localization and accessibility

- Put all UI text, alerts, errors, and accessibility labels in JSON resources under `src/localization/locales/<language-code>/`; use the typed `t` helper, whole sentences, interpolation, and plural entries. Format displayed numbers, percentages, and lists with the shared helpers. Keep stored IDs and backup formats locale-independent.
- Use library defaults and iOS language preferences, with English fallback. Add a language with complete messages, library plural/formatting data, geographic names, tests, and matching native supported locales. Verify Hermes support before using new `Intl` APIs; avoid speculative adapters and language state.
- Prefer native controls and their built-in semantics, including the `disabled` prop. Add localized labels, roles, or accessibility states only where the control does not already expose them. Hide decorative graphics, avoid duplicate VoiceOver stops, and preserve accessible alternatives to map gestures and country popups.
- Keep targets at least 44 points, allow Dynamic Type without global font caps, honor Reduce Motion, and preserve theme contrast. Use logical spacing for RTL; never mirror geographic coordinates. Keep native layout direction tied to supported app languages rather than forcing RTL from the device language.
- After UI changes, check long translations, large text, VoiceOver order/actions, and small iPhone screens. After Expo/React Native upgrades, verify the matching docs and repeat locale/RTL, VoiceOver, Dynamic Type, and Reduce Motion checks on iPhone. Report native checks that could not be run; JavaScript tests and export do not replace them.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the iOS app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode required. Run EAS CLI as `bunx eas-cli <command>` and specify iOS where a platform is required; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If an `ios/` directory does not exist, it is generated through Continuous Native Generation. Never create or edit it by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs an iOS development build: `bunx expo run:ios` locally, or `bunx eas-cli build --platform ios --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
