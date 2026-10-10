# Brainy Clan – Frontend (Expo app)

Brainy Clan is a family learning/quiz app. **This repo is the mobile/web client**: React Native +
Expo (one codebase for iOS, Android and web). The backend is the separate **Brainy-Clan-Backend**
Laravel repo: REST API under `/api/v1`, auth with Laravel Sanctum Bearer tokens, health check at
`/up`. In development it runs in Docker on the developer's Windows PC at `http://<PC-LAN-IP>:8080`.

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
app/                 Expo Router routes only (screens + _layout.tsx). No business logic here.
  (tabs)/            Home, Play, Family, Profile
  (auth)/            join with invite code
src/
  api/               client.ts (typed fetch, Bearer token, ApiError), queryClient.ts
  config/env.ts      EXPO_PUBLIC_* config (API_URL)
  features/<name>/   feature folders: family, goals, play, leaderboard, profile
  challenges/        registry.ts: challenge type key -> renderer component
  store/             zustand stores (session.ts persists the token in SecureStore)
  i18n/              i18next setup + locales (en, fr)
  ui/                theme tokens (light/dark) and shared primitives
```

Import with the `@/` alias (`@/*` -> `src/*`); route files in `app/` import from `@/...` too.

## Architecture rules

- **Feature folders**: code for a feature (screens' components, hooks, queries, types) lives in
  `src/features/<feature>/`; route files in `app/` stay thin and compose feature components.
- **Server data goes through TanStack Query** using `src/api/client.ts`; never copy server data
  into Zustand. Zustand is for client state (session token, UI preferences).
- **Challenge registry mirrors the backend plugin types**: `ChallengeTypeKey` in
  `src/challenges/registry.ts` must match the backend's challenge plugin keys. Add a new type in
  both places; unknown types from the API must be skipped gracefully, never crash.
- **The UI never decides age or ads rules itself.** It reads the member policy (age band,
  allowed content, whether ads/purchases are allowed, etc.) from the API and only renders
  accordingly. No age thresholds or monetisation rules hard-coded in the client.
- **All user-facing strings via i18n** (`t('...')`), added to every locale file (en + fr).
  Keys are type-checked against `en.json`.
- Theme colors/spacing from `src/ui/theme.ts`; support light and dark.
- Play sessions must later be **offline-tolerant** (queue answers locally, sync when back
  online); keep session logic out of components so this can be added.
- Auth token only in SecureStore via `useSession` – never in AsyncStorage/logs.

## Commands

```bash
npm start            # Metro dev server (scan QR with Expo Go)
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint (ESLint)
npm run format       # prettier --write .
npx expo-doctor      # dependency/config health
```

Run `npm run typecheck` and `npm run lint` before declaring a task done.

## Native modules / builds

The app currently runs in **Expo Go**. RevenueCat (purchases), AdMob and push notifications are
planned but **not installed yet**: they are native modules and will require an **EAS development
build** (`npx eas-cli@latest build --profile development`) instead of Expo Go. `ios/` and
`android/` are generated (CNG) and git-ignored – configure native behaviour via `app.json` and
config plugins, never by editing native folders.

## Environment notes

- Developer machine: Windows 11, PhpStorm, Node 22 LTS. Repo lives at
  `F:\Docker-Projects\Brainy-Clan\Brainy-Clan-Frontend`. Line endings are LF (`.gitattributes`).
- `EXPO_PUBLIC_API_URL` in `.env` must be the PC's LAN IP (not localhost) so a phone can reach
  the backend. `.env` is git-ignored; `.env.example` is the template.

## Plan, progress and commits

- Read `docs/PLAN.md` and `docs/PROGRESS.md` at the start of every session; work on the next milestone only.
- Update `docs/PROGRESS.md` at the end of every session (status table, next up, log entry).
- Never run `git commit`, `git push` or any history-changing git command. Moe reviews and commits.
