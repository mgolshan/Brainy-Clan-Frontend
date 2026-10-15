# Brainy Clan – Frontend

Family learning & quiz app. React Native + Expo (SDK 57) with Expo Router and TypeScript —
one codebase for iOS, Android and web.

The API is the separate **Brainy-Clan-Backend** (Laravel, Docker) at `http://<PC-LAN-IP>:8080`,
contract in `../Brainy-Clan-Backend/docs/API.md`.

## Prerequisites

- **Node.js 22 LTS** (the plan's target). Node 24 also works — this machine runs 24.14 and
  `npx expo-doctor` passes.
- **The backend running** (see the backend README): `http://localhost:8080/api/v1/health` answers
  on the PC, and `http://<PC-LAN-IP>:8080/api/v1/health` opens in your phone's browser.
- For a phone: **Expo Go** (App Store / Play Store) for everyday work, phone and PC on the
  **same Wi-Fi**. Google/Facebook sign-in needs the **development build** instead (see
  [Expo Go or development build](#expo-go-or-development-build)).
- For the browser: Chrome or Edge; the backend must allow CORS from `http://localhost:8081`.

## Setup

```powershell
cd F:\Docker-Projects\Brainy-Clan\Brainy-Clan-Frontend
npm install
copy .env.example .env
```

Edit `.env` and set your PC's LAN IP (`ipconfig` → "IPv4 Address" of the Wi-Fi adapter, e.g.
`192.168.2.23`). Do **not** use `localhost` when testing on a phone: on the phone that means the
phone.

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.2.23:8080
PC_LAN_IP=192.168.2.23
```

The Google/Facebook variables in `.env.example` can stay empty (the buttons are then hidden);
see [Google and Facebook sign-in setup](#google-and-facebook-sign-in-setup).

`EXPO_PUBLIC_*` values are baked into the bundle when Metro starts: after changing `.env`,
restart Metro with `--clear` (e.g. `npx expo start --clear`).

## Run it

### Expo Go or development build

| Command                    | Opens the app in                           | Use it for                                                            |
| -------------------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| `npm start`                | **Expo Go** (`expo start --go`)            | everyday work: everything except Google/Facebook sign-in              |
| `npm run start:dev-client` | the **development build** (`--dev-client`) | native features (Google/Facebook sign-in; later ads, purchases, push) |

Scan the QR code with Expo Go (Android) or the Camera app (iOS). The development build must be
built and installed once first (Step 4 of the sign-in setup below); afterwards open **Brainy
Clan** on the phone and pick the running server. In Expo Go the Google/Facebook buttons are
hidden.

### In the browser (port 8081)

```powershell
npm run web        # or press "w" in the npm start terminal
```

Opens `http://localhost:8081`. The browser calls the API at `EXPO_PUBLIC_API_URL`, so the
backend must allow CORS from `http://localhost:8081` (Laravel's `config/cors.php`). For
browser-only work on the PC you can skip the LAN IP:

```powershell
$env:EXPO_PUBLIC_API_URL="http://localhost:8080"; npx expo start --web --clear
```

If Metro misses a file change on the F: drive (stale screen, "is not a function"), restart it
with `--clear`.

## Preview the themes (no backend needed)

The look adapts to who is holding the phone: **playful** (kids), **sleek** (teens), **modern**
(adults, signed-out screens) and **classic** (seniors). The backend picks the default via the
policy's `ui_theme`; a member can override it in Profile → Appearance (an admin can also do it
in Family → member).

- Dev builds show a **Theme preview** button on the welcome screen and in Profile → About.
- On web, open `http://localhost:8081/dev/themes` directly.

Flip theme, light/dark, text size and reduce motion; tap an answer in the Play section to see
the feedback, try every puzzle (Sudoku 4×4 / 9×9, Math Sprint, anagram, missing letter, word
search) in the challenge samples, and **Replay** for the celebration. The screen is hidden in
production builds.

## Sign in with the demo accounts

Once the backend is running and seeded (see the backend README):

- **Mom (family admin)**: welcome screen → **Sign in** → `mom@brainyclan.test` / `password`.
- **Sam (child, 9) or Alex (teen, 14) with a sign-in code** — the normal way for kids:
  1. As Mom: Family → tap Sam → **Sign-in & devices** → **Sign in on another device** →
     **Make a sign-in code** (8 characters, valid 15 minutes, works once).
  2. On another phone or browser (e.g. an incognito window): welcome screen →
     **I have a sign-in code** → type the code (case, spaces and dashes don't matter).
  3. Back as Mom you see the new device under the member's devices and can **Sign out** it.
- **New child / teen with an invite code**: **Join with invite code**; the seed creates
  `CUBS2222` (child → playful theme) and `TEEN2828` (teen → sleek). Pending invites and their
  codes are listed in the Family tab.
- **Demo tokens** (no sign-in needed): the seed gives Sam `demo-sam-child-token` and Alex
  `demo-alex-teen-token` for API calls (`Authorization: Bearer …`, see the backend README). On
  web you can also use one in the app: in the browser console on `localhost:8081` run
  `localStorage.setItem('brainyclan.session', JSON.stringify({ state: { token: 'demo-sam-child-token' }, version: 0 }))`
  and reload. Don't tap **Sign out** in the app with a demo token — that revokes it (re-run
  `php artisan db:seed --class=DemoFamilySeeder` in the backend to restore it); remove the
  `brainyclan.session` entry instead.

Each sign-in adds a device to the member's list (Profile → **My devices**); sign out the ones
you don't need.

## Checks

Run these before handing work over (all must pass):

```powershell
npm run typecheck                 # TypeScript (tsc --noEmit)
npm run lint                      # ESLint (expo lint)
npm run format:check              # Prettier; fix with npm run format
npx expo export --platform web    # the production web bundle builds (output in dist/)
npx expo-doctor                   # dependency / config health (occasionally)
```

## Scripts

| Command                          | Description                                 |
| -------------------------------- | ------------------------------------------- |
| `npm start`                      | Start Metro for Expo Go (`expo start --go`) |
| `npm run start:dev-client`       | Start Metro for the development build       |
| `npm run android`                | Start and open on Android                   |
| `npm run ios`                    | Start and open on iOS (simulator: macOS)    |
| `npm run web`                    | Start and open in the browser (port 8081)   |
| `npm run typecheck`              | TypeScript check (`tsc --noEmit`)           |
| `npm run lint`                   | ESLint via `expo lint`                      |
| `npm run format`                 | Prettier – format all files                 |
| `npm run format:check`           | Prettier – check only                       |
| `npx expo-doctor`                | Check dependencies and config               |
| `npx expo export --platform web` | Production web bundle into `dist/`          |

## Google and Facebook sign-in setup

Adults can sign in with **Continue with Google** / **Continue with Facebook** (welcome, sign-in
and register screens) and connect or disconnect those accounts in Profile → **Sign-in methods**.
Kids never see these buttons. The app gets a token from the provider and sends it to the backend
(`POST /api/v1/auth/social/{provider}`), which verifies it with Google/Facebook.

How it works per platform:

|               | Google                                                                                           | Facebook                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Android / iOS | native sign-in sheet (`react-native-nitro-google-signin`, Android Credential Manager) → ID token | Facebook login page in the system browser (`expo-auth-session`) → access token |
| Web           | Google popup (`expo-auth-session`, OpenID Connect) → ID token                                    | Facebook popup (`expo-auth-session`) → access token                            |
| Expo Go       | hidden (needs a development build)                                                               | hidden (needs a development build)                                             |

A button only appears when its IDs are configured, so nothing breaks before you finish this
setup. You need: a Google account, a Facebook account, and (for phones) an Expo account for EAS
builds. iOS builds also need an Apple Developer account.

### Step 1 – Google Cloud console

1. Open https://console.cloud.google.com, sign in, and in the project picker (top left) click
   **New project** → name it `Brainy Clan` → **Create**. Make sure it is selected.
2. Menu → **Google Auth Platform** (older consoles: **APIs & Services → OAuth consent screen**).
   Click **Get started**:
   - **App information**: app name `Brainy Clan`, your support email.
   - **Audience**: **External**.
   - **Contact information**: your email. Accept the policy → **Create**.
3. **Branding**: add the app logo, home page, privacy policy URL and authorized domain when you
   have them (needed before going public; not needed for testing).
4. **Data access** → **Add or remove scopes**: tick `openid`, `.../auth/userinfo.email` and
   `.../auth/userinfo.profile` → **Update** → **Save**. These are non-sensitive scopes (no Google
   review needed).
5. **Audience**: while the app is in **Testing**, only the **Test users** you add here can sign
   in (add your own Gmail addresses). When ready for everyone, click **Publish app**.
6. **Clients** → **Create client**, three times:

   **a) Web application** (used by web _and_ to issue the ID token on Android)
   - Name: `Brainy Clan web`.
   - **Authorized JavaScript origins**: `http://localhost:8081` (later also your web domain,
     e.g. `https://app.example.com`).
   - **Authorized redirect URIs**: `http://localhost:8081/oauth-callback` (later also
     `https://<your web domain>/oauth-callback`). It must match exactly, path included.
   - **Create** → copy the **Client ID** → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Ignore the client
     secret; the app never uses it.

   **b) Android**
   - Package name: `app.brainyclan` (from `app.json`).
   - **SHA-1 certificate fingerprint** of the key that signs the build (see "Get the Android
     SHA-1" below). Google recognises the app by package name + SHA-1.
   - Create one Android client **per signing key**: the EAS development keystore, and later the
     Google Play **app signing key** (Play Console → your app → Test and release → App integrity
     → App signing → SHA-1). Android clients have no env variable; they only need to exist.

   **c) iOS**
   - Bundle ID: `app.brainyclan` (App Store ID / Team ID can stay empty for now).
   - **Create** → copy the **Client ID** → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. `app.config.ts`
     turns it into the iOS URL scheme (`com.googleusercontent.apps.…`) automatically.

7. Give the backend the client IDs it must accept as the ID-token audience (the Web client ID
   and the iOS client ID).

**Get the Android SHA-1**

- EAS builds (recommended): run `npx eas-cli@latest credentials -p android` → pick the build
  profile (`development`) → **Keystore** → it prints the `SHA1 Fingerprint` (you can let it
  generate the keystore there before the first build).
- Local builds (`npx expo run:android`): the debug key of the generated project:

  ```powershell
  keytool -list -v -keystore android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```

  `keytool` ships with Android Studio: `"C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"`.

### Step 2 – Meta for Developers (Facebook)

1. Open https://developers.facebook.com, log in with your Facebook account and register as a
   developer if asked (**Get started**).
2. **My Apps** → **Create app** → app name `Brainy Clan`, contact email → use case
   **Authenticate and request data from users with Facebook Login** → business portfolio: "I
   don't want to connect a business portfolio yet" → **Create app**.
3. **App settings → Basic**:
   - Copy the **App ID** → `EXPO_PUBLIC_FACEBOOK_APP_ID`.
   - The **App secret** is for the backend only (it verifies tokens with it). Never put it in the
     app. The app doesn't need the **Client token** either (only the Facebook SDK uses it, and
     this app doesn't include the SDK).
   - Fill **Privacy policy URL**, **User data deletion** (instructions URL), **Category** and the
     **App icon** (all required to go live).
   - **Add platform** → **Android**: package name `app.brainyclan`, class name
     `app.brainyclan.MainActivity`, **Key hashes** (step 5) → **Save**.
   - **Add platform** → **iOS**: bundle ID `app.brainyclan` → **Save**.
   - **Add platform** → **Website**: site URL `http://localhost:8081/` (later your web domain).
4. **Use cases → Authenticate and request data from users with Facebook Login → Customize**:
   - **Permissions**: make sure `public_profile` and `email` are added (no App Review needed).
   - **Settings**: **Client OAuth login** = Yes, **Web OAuth login** = Yes, **Enforce HTTPS** =
     Yes, **Use Strict Mode for redirect URIs** = Yes. **Valid OAuth Redirect URIs**:
     - `fb<APP_ID>://authorize` (e.g. `fb1234567890://authorize`) for the phone builds,
     - `https://<your web domain>/oauth-callback` for the web version (localhost redirects are
       allowed automatically while the app is in development mode).

     **Save changes**.

5. **Android key hash**: Facebook wants the SHA-1 from Step 1 as Base64. In PowerShell:

   ```powershell
   $sha1 = "5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25"   # yours
   [Convert]::ToBase64String(($sha1 -split ':' | ForEach-Object { [Convert]::ToByte($_, 16) }))
   ```

   Add one hash per signing key (EAS development keystore, Play app signing key).

6. **Testing vs live**: in **Development** mode only people with a role on the app can log in
   (**App roles → Roles → Add people** as Testers; they accept the invite on facebook.com). When
   ready: complete the Basic settings above, then switch the app to **Live** (app mode toggle /
   **Publish** in the dashboard). `public_profile` and `email` need no App Review; follow the
   dashboard if Meta asks for extra checks (e.g. data use or business verification).

### Step 3 – environment variables

Locally, add them to `.env` (template in `.env.example`) and **restart Metro with `--clear`**
(`EXPO_PUBLIC_*` values are baked into the bundle):

```dotenv
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1234-abc.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=1234-def.apps.googleusercontent.com
EXPO_PUBLIC_FACEBOOK_APP_ID=1234567890
```

EAS cloud builds don't see `.env` (it's git-ignored, so not uploaded). Store the same three
values as EAS environment variables for each environment used in `eas.json` (`development`,
`preview`, `production`) on expo.dev (project → **Environment variables**) or with:

```powershell
npx eas-cli@latest env:create --environment development --visibility plaintext --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "1234-abc.apps.googleusercontent.com"
```

The iOS client ID and the Facebook app ID also change native config (URL schemes): after
changing them you need a **new build**, not only a Metro restart.

### Step 4 – development build and testing

Native sign-in can't run in Expo Go. Build the app once with EAS (the free plan is enough):

```powershell
npx eas-cli@latest login
npx eas-cli@latest init        # first time only: links the project (adds a projectId)
npx eas-cli@latest build --profile development --platform android
```

- Android: open the build link / QR code on the phone and install the APK. Get the SHA-1
  (`eas credentials`, Step 1) and add it to Google (Android client) and Facebook (key hash).
- iOS (Apple Developer account): register your iPhone with `npx eas-cli@latest device:create`,
  then `npx eas-cli@latest build --profile development --platform ios`. On a Mac the
  `development-simulator` profile builds for the simulator.
- Start Metro for the dev build with `npm run start:dev-client` and open **Brainy Clan** on the
  phone (same Wi-Fi as the PC; it lists the running server). `npm start` still opens Expo Go.
- Rebuild only when native config changes (a new native package, iOS client ID, Facebook app
  ID); JavaScript changes reload as usual.

Test checklist: Welcome → **Continue with Google** → pick an account → the first time you see
**Tell us your birth year and month** → you're in (family set-up for a new user). Sign out, tap
it again → straight in. Same with Facebook. Profile → **Sign-in methods** → **Connect** /
**Disconnect** (tap twice). Web: `npm run web` with the variables in `.env`.

Without real IDs (UI work, dev builds only): `EXPO_PUBLIC_SOCIAL_FAKE=1` makes both buttons
return a fake token (`dev-fake-google-token` / `dev-fake-facebook-token`) so the screens after
the provider can be tried against a mock backend. It is compiled out of production builds.

### Troubleshooting sign-in

- **No Google/Facebook buttons**: you're in Expo Go (use the dev build), the env variables are
  missing, or Metro wasn't restarted with `--clear` after editing `.env`. On iOS, Google also
  needs `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` _in the build_.
- **Google `DEVELOPER_ERROR` on Android**: the SHA-1 / package name of the installed build isn't
  registered as an Android client, or the Web client ID is wrong (it must be the **Web** client,
  not the Android one). The fingerprint changes when the signing key changes (local debug vs
  EAS vs Play signing).
- **Google `redirect_uri_mismatch` (web)**: add exactly `http://localhost:8081/oauth-callback`
  (or your domain) to the Web client, and the origin to _Authorized JavaScript origins_.
- **Google "Access blocked" / "app has not completed verification"**: add the account as a test
  user (Audience) or publish the app.
- **Facebook "URL blocked" / "Can't load URL"**: the redirect (`fb<APP_ID>://authorize` or
  `https://…/oauth-callback`) is missing from Valid OAuth Redirect URIs, or the platform
  (Android / iOS / Website) isn't added.
- **Facebook "App not active" / "in development mode"**: add the person as a tester or switch
  the app to Live.
- **Nothing happens on web**: the browser blocked the popup; allow popups for the site.
- **"We couldn't verify your Google or Facebook account"** (401 `social_token_invalid`): the
  backend doesn't accept that client ID / app; check its configuration matches these IDs.
- **Birth year asked with an error**: the backend answered 422 for the birth data (below the
  adult threshold).

## Sign in with Apple — setup

"Continue with Apple" uses `expo-apple-authentication` (Apple's own native button and sheet). It
shows **only in an iOS build** (development or production) where `isAvailableAsync()` is true —
never on Android, web or in Expo Go (Expo Go's tokens are issued for Expo's bundle ID, which the
backend rejects). App Review requires it on iOS because the app offers Google/Facebook too.

1. **Apple Developer Program** membership (paid, 99 USD/year) — needed for any iOS device build.
2. **Bundle ID with the capability**: the app's bundle ID is `app.brainyclan` (`app.json` →
   `ios.bundleIdentifier`). `ios.usesAppleSignIn: true` is already set and the
   `expo-apple-authentication` plugin adds the `com.apple.developer.applesignin` entitlement.
   When EAS builds, it syncs the capability to the App ID automatically (or enable "Sign In with
   Apple" by hand in developer.apple.com → Certificates, IDs & Profiles → Identifiers →
   `app.brainyclan`). No client ID or env variable is needed in the app.
3. **Backend**: set `APPLE_CLIENT_IDS=app.brainyclan` in the backend `.env` (the identity token's
   `aud` is the bundle ID; add the Services ID later for web).
4. **iOS development build** with EAS (see Step 4 above):
   ```powershell
   npx eas-cli@latest device:create          # register the iPhone (first time)
   npx eas-cli@latest build --profile development --platform ios
   ```
   Install it from the build link on the iPhone, then `npm run start:dev-client`.
5. **Test on an iPhone** signed in to an Apple ID (the simulator works too on a Mac, but a real
   device is the reliable check): Welcome → **Continue with Apple** → Face ID → the first time
   you see **Tell us your birth year and month** → you're in. Apple shares the name (sent as
   `display_name`) and email only on the **first** authorization; to see the first-time flow
   again, remove the app under iPhone Settings → [your name] → Sign-In & Security → Sign in with
   Apple. "Hide My Email" gives a `…@privaterelay.appleid.com` address — that's fine. Profile →
   **Sign-in methods** shows Apple with Apple's own button to connect, and **Disconnect**.
   Cancelling the Apple sheet does nothing (no error).

How it works: the app makes a random nonce, passes its SHA-256 to Apple, and sends the identity
token plus the raw `nonce` (and `display_name` on the first sign-in) to
`POST /auth/social/apple`; the server checks the token's signature, `aud` and nonce.

**Web (later, optional)**: needs a Services ID with the web domain and return URL, and the Apple
JS redirect flow; not built yet.

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
  (auth)/                  welcome, login, register, join, code (sign-in code entry)
  (onboarding)/            create-family
  (tabs)/                  Home, Play, Family, Profile
  play/[session].tsx       the play screen
  category/[id].tsx        category drill-down
  member/[id].tsx, invite.tsx   admin: edit member, create invite
  sign-in-code/[id].tsx    admin: sign-in code for a member
  goals/                   goals list, detail ([id]), new-goal wizard
  oauth-callback.tsx       web redirect target for Google/Facebook
  dev/themes.tsx           dev-only theme preview
src/
  api/                     client.ts (ApiError + codes), types.ts (from API.md), queryKeys, queryClient
  features/                app, auth (+ social), family, profile, home, play (session logic, answer queue), goals, dev
  challenges/              registry.ts + MultipleChoice, WisdomCard, MathSprint, sudoku/, words/
  ui/                      ThemeProvider/useTheme, themes/ (one file per theme), components/
  store/                   zustand: session token (SecureStore), preferences, app status
  i18n/                    i18next, locales/en.json + fr.json
```

## Docker alternative

A `Dockerfile` and `docker-compose.yml` exist for a consistent Node environment and CI
(`docker compose up --build`, set `PC_LAN_IP` in `.env`). On Windows, file watching from the F:
drive into Docker is unreliable for Metro, so daily work should use `npm start` natively.

## Later

RevenueCat, AdMob and push notifications are native modules and need the EAS development build
(already required for Google/Facebook sign-in, see above). See `CLAUDE.md` for architecture rules.
