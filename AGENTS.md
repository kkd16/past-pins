This is an iOS-only Expo/React Native mobile application for iPhone and iPad. Prioritize mobile-first patterns, performance, accessibility, and native iOS conventions. Do not add Android or web support unless the user explicitly changes the supported platforms.

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
bunx expo install <package>  # ALWAYS use for app dependencies — resolves SDK-compatible versions
bunx expo start --ios        # start the iOS dev server
bunx expo lint               # lint
bunx tsc --noEmit            # typecheck
bunx expo-doctor             # diagnose dependency and config issues
bunx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Localization and accessibility

- Put all UI text, alerts, errors, and accessibility labels in JSON resources under `src/localization/locales/<language-code>/`; use the typed `t` helper, whole sentences, interpolation, and plural entries. Format displayed numbers, percentages, and lists with the shared helpers. Keep stored IDs and backup formats locale-independent.
- Use library defaults and iOS language preferences, with English fallback. Add a language with complete messages, library plural/formatting data, geographic names, tests, and matching native supported locales. Verify Hermes support before using new `Intl` APIs; avoid speculative adapters and language state.
- Prefer native controls and their built-in semantics, including the `disabled` prop. Add localized labels, roles, or accessibility states only where the control does not already expose them. Hide decorative graphics, avoid duplicate VoiceOver stops, and preserve accessible alternatives to map gestures and country popups.
- Keep targets at least 44 points, allow Dynamic Type without global font caps, honor Reduce Motion, and preserve theme contrast. Use logical spacing for RTL; never mirror geographic coordinates. Keep native layout direction tied to supported app languages rather than forcing RTL from the device language.
- After UI changes, check long translations, large text, VoiceOver order/actions, and short iPad layouts. After Expo/React Native upgrades, verify the matching docs and repeat locale/RTL, VoiceOver, Dynamic Type, and Reduce Motion checks on iPhone and iPad. Report native checks that could not be run; JavaScript tests and export do not replace them.

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
