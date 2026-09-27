# Project rules

PastPins is an iPhone-only Expo/React Native app. Prioritize performance, accessibility, and native iOS conventions.

Keep `ios.supportsTablet` set to `false`. Do not add iPad layouts, workarounds, or other platform support unless the user changes this scope.

## Keep changes simple

- Prefer native controls and documented library defaults. Reuse existing helpers before adding dependencies, wrappers, or state.
- Fix demonstrated problems at their source. Explain behavior changes and cover data and asynchronous failures where practical.
- Keep code free of comments. Put architectural explanations and development guidance in documentation.

## Use project commands

- Use the project or framework CLI for package management, scaffolding, configuration, and validation.
- Use Bun and `bunx`. Install app dependencies with `bunx expo install <package>`.
- Never hand-edit `bun.lock`; let Expo or Bun update it.
- Use `bun pm pkg` for supported `package.json` metadata changes.
- Prefer Expo modules and check available skills before adding dependencies.

## Check the matching Expo docs

Before changing Expo, EAS, or React Native APIs:

1. Read the Expo major version in `package.json`.
2. Fetch `https://docs.expo.dev/versions/v<major>.0.0/`.
3. For other topics, fetch [Expo’s documentation index](https://docs.expo.dev/llms.txt) and follow the relevant links.

## Verify changes

- Run lint and typecheck before declaring any task done: `bun run lint` and `bun run typecheck`.
- Before **every push**, run `bun run verify` from the repository root and require exit code 0. Rerun after any edit, merge, or rebase.
- If verification fails or cannot finish, fix it and rerun the full gate. Do not push, skip checks, suppress failures, or substitute individual checks or earlier CI results.
- GitHub Actions must run the same `bun run verify`. Keep the shared flow in `scripts/verify.sh` and its package scripts; do not duplicate the check list in another runner.

See [development.md](development.md) for local setup, recovery, and releasing updates.

## Preserve released data

- Preserve data and backup contracts distributed through TestFlight or the App Store. Keep released fixtures unchanged; add pure forward migrations and new fixtures when stored formats need conversion.
- Saved documents and imported backups must use the same decoder. Test migrations from every affected released schema.
- Preserve unknown, future, and corrupt documents until explicit recovery. Never silently clear data or drop unknown geographic IDs. Audit stored IDs and list membership before catalog changes.
- Preserve the atomic checkpoint-plus-document transaction and serialized storage queue. Cover import failures, interrupted transactions, repeated loads, and stale asynchronous actions when persistence changes.
- New app-owned storage needs a backup/reset policy, native cold-reset ownership where relevant, and regression coverage.
- Keep diagnostics bounded, local, and free of raw errors or user data.
- Native recovery changes require a new iPhone build and physical-device cold-launch/reset checks. Expo Go and JavaScript tests cannot validate this safeguard.

## Localization and accessibility

- Put UI text, alerts, errors, and accessibility labels in JSON under `src/localization/locales/<language-code>/`. Use typed `t`, whole sentences, interpolation, and plural entries.
- Use shared helpers for displayed numbers, percentages, and lists. Keep stored IDs and backup formats locale-independent.
- Follow library defaults and iOS language preferences, with English fallback. A new language needs complete messages, plural/formatting data, geographic names, tests, and matching native supported locales.
- Verify Hermes support before adding `Intl` APIs. Avoid speculative adapters and custom language state.
- Use native semantics, including `disabled`. Add localized labels, roles, or states only when the control does not provide them. Hide decorative graphics and avoid duplicate VoiceOver stops.
- Preserve accessible alternatives to map gestures and country popups. Keep targets at least 44 points, allow Dynamic Type without global caps, honor Reduce Motion, and preserve theme contrast.
- Use logical spacing for RTL; never mirror geographic coordinates. Tie native layout direction to supported app languages rather than forcing it from the device language.
- After UI changes, check long translations, large text, VoiceOver order/actions, and small iPhones. After Expo/React Native upgrades, repeat locale/RTL, VoiceOver, Dynamic Type, and Reduce Motion checks on iPhone.
- Report native checks that could not be run. JavaScript tests and exports do not replace them.

## Navigation

- Use [Expo Router](https://docs.expo.dev/router/introduction.md) for all navigation.
- Keep routes in `src/app/` and navigators in `_layout.tsx`. Keep components, hooks, and utilities outside the route directory.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.

## Native builds and releases

- Use `bunx eas-cli <command>` to build, sign, and submit through EAS. Specify `--platform ios` where required.
- Ship updates through the [release workflow](development.md#release-an-update). No EAS Update channel is configured.
- Configure native behavior through `app.json`, `app.config.ts`, and config plugins. CNG generates `ios/`; never create or edit generated native files by hand.
- Rebuild after native dependency or configuration changes. Expo Go only contains its bundled native modules.
- Create a development build with `bunx eas-cli build --platform ios --profile development`, or use `bunx expo run:ios` on a Mac.
