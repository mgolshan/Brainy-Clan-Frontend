# Brainy Clan – Frontend

Family learning & quiz app. React Native + Expo (SDK 57) with Expo Router and TypeScript —
one codebase for iOS, Android and web.

The API is the separate **Brainy-Clan-Backend** (Laravel, Docker) at `http://<PC-LAN-IP>:8080`.

## Prerequisites

- **Node.js 22 LTS** installed on Windows (`node -v` → v22.x)
- **Expo Go** on your phone (App Store / Play Store), or later a development build
- Phone and PC on the **same Wi-Fi**
- The backend running (`http://<PC-LAN-IP>:8080/up` opens in your phone's browser)

## Setup

```powershell
cd F:\Docker-Projects\Brainy-Clan\Brainy-Clan-Frontend
npm install
copy .env.example .env
```

Edit `.env` and replace `192.168.1.50` with your PC's LAN IP (`ipconfig` → "IPv4 Address" of
your Wi-Fi/Ethernet adapter). Do **not** use `localhost`: on the phone that means the phone.

```powershell
npm start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS). Press `w` for the web version.
The Home tab shows **Backend status: Connected** when the API is reachable.

Troubleshooting:

- Not reachable: allow Node.js and port 8080 through Windows Defender Firewall (Private network),
  and check that the Wi-Fi is set as a _Private_ network in Windows.
- Phone can't load the bundle: try `npx expo start --tunnel`.
- After changing `.env`, restart Metro with `npx expo start -c` (env values are inlined).

## Docker alternative

A `Dockerfile` and `docker-compose.yml` are provided for a consistent Node environment, web
builds and CI:

```powershell
docker compose up --build
```

Set `PC_LAN_IP` in `.env` first (it is advertised in the QR code). Metro listens on port 8081.

**Honest caveat:** on Windows, file-change detection from a bind mount of an `F:` drive into
Docker is unreliable for Metro (polling is enabled but fast refresh can still lag or miss
changes, and it is slow). The recommended daily workflow is `npm start` natively on Windows
with Node 22 LTS. `node_modules` lives in a named Docker volume, so it never mixes with the
Windows one.

## Project structure

```
app/                     Expo Router routes
  _layout.tsx            root: QueryClientProvider, i18n init, Stack
  (tabs)/                Home, Play, Family, Profile
  (auth)/join.tsx        join with invite code (placeholder)
src/
  api/                   fetch client (Bearer token, ApiError) + TanStack QueryClient
  config/env.ts          EXPO_PUBLIC_API_URL
  features/              family, goals, play, leaderboard, profile
  challenges/registry.ts challenge type -> component registry (mirrors backend plugins)
  store/session.ts       zustand session (token persisted in expo-secure-store)
  i18n/                  i18next setup, locales/en.json, locales/fr.json
  ui/                    theme tokens (light/dark), Screen
assets/                  icons and splash (template placeholders for now)
```

Imports use the `@/` alias for `src/` (e.g. `import { api } from '@/api/client'`).

## Scripts

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `npm start`         | Start Metro (Expo Go QR code)            |
| `npm run android`   | Start and open on Android                |
| `npm run ios`       | Start and open on iOS (simulator: macOS) |
| `npm run web`       | Start and open in the browser            |
| `npm run lint`      | ESLint via `expo lint`                   |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`)        |
| `npm run format`    | Prettier – format all files              |
| `npx expo-doctor`   | Check dependencies and config            |

## Later

RevenueCat, AdMob and push notifications are native modules and will require an EAS
development build instead of Expo Go. See `CLAUDE.md` for architecture rules.
