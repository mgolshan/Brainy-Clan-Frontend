# Brainy Clan – Frontend

Family learning & quiz app. React Native + Expo (SDK 57) with Expo Router and TypeScript —
one codebase for iOS, Android and web.

The API is the separate **Brainy-Clan-Backend** (Laravel, Docker) at `http://<PC-LAN-IP>:8080`,
contract in `../Brainy-Clan-Backend/docs/API.md`.

## Prerequisites

- **Node.js 22 LTS** (the plan's target). Node 24 also works — this machine runs 24.14 and
  `npx expo-doctor` passes.
- **Expo Go** on your phone (App Store / Play Store). Everything used so far runs in Expo Go;
  a development build is only needed from F6 (ads, purchases, push).
- Phone and PC on the **same Wi-Fi**.
- The backend running: `http://<PC-LAN-IP>:8080/api/v1/health` should open in your phone's browser.

## Setup

```powershell
cd F:\Docker-Projects\Brainy-Clan\Brainy-Clan-Frontend
npm install
copy .env.example .env
```

Edit `.env` and set your PC's LAN IP (`ipconfig` → "IPv4 Address" of the Wi-Fi adapter, e.g.
`192.168.2.23`). Do **not** use `localhost`: on the phone that means the phone.

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.2.23:8080
PC_LAN_IP=192.168.2.23
```

After changing `.env`, restart Metro with `npx expo start -c` (env values are inlined at build time).

## Run it

### On your phone (Expo Go)

```powershell
npm start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

### In the browser

```powershell
npm run web        # or press "w" in the npm start terminal
```

Opens `http://localhost:8081`. The browser calls the API at `EXPO_PUBLIC_API_URL`, so the
backend must allow CORS from `http://localhost:8081` (Laravel's `config/cors.php`).

## Preview the themes (no backend needed)

The look adapts to who is holding the phone: **playful** (kids), **sleek** (teens), **modern**
(adults, signed-out screens) and **classic** (seniors). The backend picks the default via the
policy's `ui_theme`; a member can override it in Profile → Appearance.

- Dev builds show a **Theme preview** button on the welcome screen (and in Profile → About).
- On web, open `http://localhost:8081/dev/themes` directly.

Flip theme, light/dark, text size and reduce motion; tap an answer in the Play section to see
the feedback, and **Replay** for the celebration. The screen is hidden in production builds.

## Sign in with the demo accounts

Once the backend is running and seeded (see the backend README), on the welcome screen tap
**Sign in** and use:

- `mom@brainyclan.test` / `password` (family admin)

Kids join with invite codes: in the Family tab (as Mom) the pending invites show their codes;
on another device/browser tap **Join with invite code** and type one (at the time of writing
the seed creates `CUBS2222` for a child → playful theme and `TEEN2828` for a teen → sleek). To test the other themes,
switch Profile → Appearance → Theme, or join with a child/teen invite.

## Scripts

| Command                          | Description                              |
| -------------------------------- | ---------------------------------------- |
| `npm start`                      | Start Metro (Expo Go QR code)            |
| `npm run android`                | Start and open on Android                |
| `npm run ios`                    | Start and open on iOS (simulator: macOS) |
| `npm run web`                    | Start and open in the browser            |
| `npm run typecheck`              | TypeScript check (`tsc --noEmit`)        |
| `npm run lint`                   | ESLint via `expo lint`                   |
| `npm run format`                 | Prettier – format all files              |
| `npm run format:check`           | Prettier – check only                    |
| `npx expo-doctor`                | Check dependencies and config            |
| `npx expo export --platform web` | Production web bundle into `dist/`       |

## Troubleshooting

- Phone shows "Can't reach Brainy Clan": allow Node.js and port 8080 through Windows Defender
  Firewall (Private network) and make sure the Wi-Fi is a _Private_ network in Windows.
- Phone can't load the bundle: try `npx expo start --tunnel`.
- "Time for an update" screen: the API reported a `min_app_version` newer than `app.json`'s
  `version` (or answered 426).

## Project structure

```
app/                       Expo Router routes (thin: they render feature screens)
  _layout.tsx              providers, fonts, auth-guard routing (Stack.Protected)
  (auth)/                  welcome, login, register, join
  (onboarding)/            create-family
  (tabs)/                  Home, Play, Family, Profile
  play/[session].tsx       the play screen
  category/[id].tsx        category drill-down
  member/[id].tsx, invite.tsx   admin: edit member, create invite
  dev/themes.tsx           dev-only theme preview
src/
  api/                     client.ts (ApiError + codes), types.ts (from API.md), queryKeys, queryClient
  features/                app, auth, family, profile, home, play (session logic, answer queue), dev
  challenges/              registry.ts + MultipleChoice, WisdomCard
  ui/                      ThemeProvider/useTheme, themes/ (one file per theme), components/
  store/                   zustand: session token (SecureStore), preferences, app status
  i18n/                    i18next, locales/en.json + fr.json
```

## Docker alternative

A `Dockerfile` and `docker-compose.yml` exist for a consistent Node environment and CI
(`docker compose up --build`, set `PC_LAN_IP` in `.env`). On Windows, file watching from the F:
drive into Docker is unreliable for Metro, so daily work should use `npm start` natively.

## Later

RevenueCat, AdMob and push notifications are native modules and will require an EAS
development build instead of Expo Go. See `CLAUDE.md` for architecture rules.
