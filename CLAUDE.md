# Brainy Clan – Frontend (Expo app)

Brainy Clan is a family learning/quiz app. **This repo is the mobile/web client**: React Native +
Expo (one codebase for iOS, Android and web). The backend is the separate **Brainy-Clan-Backend**
Laravel repo: REST API under `/api/v1`, auth with Laravel Sanctum Bearer tokens, health check at
`GET /api/v1/health`. The API contract is `../Brainy-Clan-Backend/docs/API.md`; `src/api/types.ts`
is typed from it (never guess shapes; contract changes happen there first). In development it runs in Docker on the developer's Windows PC at `http://<PC-LAN-IP>:8080`.

Design doc: https://claude.ai/code/artifact/47b231d3-1586-470a-865b-5ea4b6349434 (read it fully before starting a build step)

## Stack (locked decisions)

- Expo SDK 57, TypeScript strict, Expo Router (file-based routes in `app/`)
- Zustand for app/client state, TanStack Query for server state
- i18next + react-i18next + expo-localization (locales in `src/i18n/locales/`)
- expo-secure-store for the auth token, @shopify/flash-list for long lists, Reanimated
- ESLint (eslint-config-expo) + Prettier

## Expo changes fast – do not trust training data

Before using an Expo / React Native API, check the docs for the installed SDK major
(`expo` in package.json): `https://docs.expo.dev/versions/v57.0.0/`, index at
https://docs.expo.dev/llms.txt. Add Expo/RN packages with `npx expo install <pkg>` (never plain
`npm install`) so versions match the SDK; pure JS packages may use `npm install`.

## Layout

```
app/                 Expo Router routes only (thin: render screens from src/features). No logic.
  _layout.tsx        providers, fonts, auth-guard routing with Stack.Protected
  (auth)/            welcome, login, register, join     (onboarding)/  create-family
  (tabs)/            Home, Play, Family, Profile         play/[session], category/[id], member/[id], invite
  dev/themes.tsx     dev-only theme preview (guarded by __DEV__)
src/
  api/               client.ts (fetch, Bearer, X-App-Version, ApiError with contract `code`),
                     types.ts (from API.md), queryKeys.ts, queryClient.ts
  config/env.ts      EXPO_PUBLIC_API_URL, APP_VERSION
  features/<name>/   app, auth, family, profile, home, play (session logic + offline answer queue), dev
  challenges/        registry.ts (type key -> renderer + payload guard) + MultipleChoice, WisdomCard
  store/             zustand: session.ts (token in SecureStore), preferences.ts, appStatus.ts
  i18n/              i18next setup + locales (en, fr)
  ui/                ThemeProvider.tsx (useTheme), themes/ (13 worlds), scenes/ (world backgrounds),
                     components/ (Screen, Text, Button, Card, TextField, Avatar, ProgressBar, ...)
  lib/               small pure helpers (errors, formatting, labels, version compare)
```

Import with the `@/` alias (`@/*` -> `src/*`); route files in `app/` import from `@/...` too.

## Architecture rules

- **Feature folders**: code for a feature (screens' components, hooks, queries, types) lives in
  `src/features/<feature>/`; route files in `app/` stay thin and compose feature components.
- **Server data goes through TanStack Query** using `src/api/client.ts` (keys in
  `src/api/queryKeys.ts`); never copy server data into Zustand. The member policy is read from
  the `me` query (`usePolicy()`). Zustand is for client state (session token, UI preferences).
- **Challenge registry mirrors the backend plugin types**: `ChallengeTypeKey` in
  `src/challenges/registry.ts` must match the backend's challenge plugin keys. Add a new type in
  both places; unknown types from the API must be skipped gracefully, never crash.
- **The UI never decides age or ads rules itself.** It reads the member policy (age band,
  allowed content, whether ads/purchases are allowed, etc.) from the API and only renders
  accordingly. No age thresholds or monetisation rules hard-coded in the client.
- **All user-facing strings via i18n** (`t('...')`), added to every locale file (en + fr).
  Keys are type-checked against `en.json`.
- **Age-adaptive themes** (`src/ui/themes/`, see docs/PLAN.md): components read colors, type,
  radius, spacing, touch target and motion only through `useTheme()` — no raw hex values or font
  names in components. Theme = member `accessibility.theme` → policy `ui_theme` → `modern`
  (`selectThemeKey`); the app never maps ages to themes. Every theme has light + dark tokens;
  respect `theme.reducedMotion` (member setting or OS) and the member text scale. Check new UI in
  every world (light + dark) at `/dev/themes`; the contrast test checks AA.
- Play session logic lives in `src/features/play/usePlaySession.ts`, not in components. Answers
  that fail for network reasons go to the persisted queue (`answerQueue.ts`) and are re-sent when
  the device is back online.
- Auth token only in SecureStore via `useSession` – never in AsyncStorage/logs.

## Commands

```bash
npm start            # Metro dev server (scan QR with Expo Go)
npm test             # unit tests (Jest + jest-expo), npm run test:watch while working
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint (ESLint)
npm run format       # prettier --write .
npx expo-doctor      # dependency/config health
```

Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run format:check` before declaring a
task done; `npx expo export --platform web` must bundle.

Tests live in `__tests__/*.test.ts` next to the code under `src/` (never in `app/`); see README
"Tests". When you add or change pure logic (guards, parsing, dates, queues), add or update its
tests; keep logic out of components so it stays testable. Every locale key must exist in en and
fr with all plural forms (`_one`/`_other`, French also `_many`) — the i18n parity test checks it.

## Native modules / builds

The app runs in **Expo Go** for daily work (`npm start`), and in an **EAS development build**
(`expo-dev-client`, `eas.json`, `npm run start:dev-client`) for native features such as Google
sign-in. `app.config.ts` extends `app.json` with env-driven settings (social client IDs, URL
schemes, AdMob app IDs). Brand colours of third parties (Google/Facebook buttons) live only in `src/ui/brand.ts`. RevenueCat (purchases,
`src/features/billing/store.ts`), AdMob (rewarded ads, `src/features/play/rewardedAd.ts`) and push
notifications are native modules that only work in an **EAS development build**
(`npx eas-cli@latest build --profile development`), never in Expo Go or on web: they are imported
lazily, have `.web.ts` stubs and hide their UI when unavailable (`src/config/monetization.ts`). `ios/` and
`android/` are generated (CNG) and git-ignored – configure native behaviour via `app.json` and
config plugins, never by editing native folders.

## Environment notes

- Developer machine: Windows 11, PhpStorm, Node 22 LTS planned (Node 24 currently installed and working). Repo lives at
  `F:\Docker-Projects\Brainy-Clan\Brainy-Clan-Frontend`. Line endings are LF (`.gitattributes`).
- `EXPO_PUBLIC_API_URL` in `.env` must be the PC's LAN IP (not localhost) so a phone can reach
  the backend. `.env` is git-ignored; `.env.example` is the template.

## Plan, progress and commits

- Read `docs/PLAN.md` and `docs/PROGRESS.md` at the start of every session; work on the next milestone only.
- Update `docs/PROGRESS.md` at the end of every session (status table, next up, log entry).
- Never run `git commit`, `git push` or any history-changing git command. Moe reviews and commits.
