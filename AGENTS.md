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
