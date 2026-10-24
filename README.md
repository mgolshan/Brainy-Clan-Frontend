# Brainy Clan – Frontend

Family learning & quiz app. React Native + Expo (SDK 57) with Expo Router and TypeScript —
one codebase for iOS, Android and web.

The API is the separate **Brainy-Clan-Backend** (Laravel, Docker) at `http://<PC-LAN-IP>:8080`,
contract in `../Brainy-Clan-Backend/docs/API.md`.

**Operations (app releases, OTA, store reviews):** [docs/OPERATIONS_HANDBOOK.md](docs/OPERATIONS_HANDBOOK.md);
the canonical ops handbook is `../Brainy-Clan-Backend/docs/OPERATIONS_HANDBOOK.md`.

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
npm test                          # unit tests (Jest, ~10 s)
npm run typecheck                 # TypeScript (tsc --noEmit)
npm run lint                      # ESLint (expo lint)
npm run format:check              # Prettier; fix with npm run format
npx expo export --platform web    # the production web bundle builds (output in dist/)
npx expo-doctor                   # dependency / config health (occasionally)
```

## Tests

Unit tests cover the pure logic: no network, no device, no backend. They run in Node with
[`jest-expo`](https://docs.expo.dev/develop/unit-testing/) (Jest preset for Expo).

```powershell
npm test                          # run all tests once
npm run test:watch                # re-run tests for changed files
npx jest src/features/goals       # one folder (or a file path)
npx jest -t "word search"         # tests whose name matches
```

- **Where:** next to the code, in `__tests__/*.test.ts` folders under `src/` (never in `app/`,
  which is the router). Import app code with the `@/` alias, like the app does. Expo Router only
  bundles what routes import, so tests never reach the app or the web export.
- **What is covered:** Sudoku rules (duplicates, 4/6/9 boxes), word puzzles (8-direction
  word-search selection, accents), challenge registry payload guards (every type, valid and
  invalid), sign-in/invite code entry, version compare, theme selection, error messages for the
  contract codes, goal dates and period labels (fixed dates; family vs device time zone),
  notification times, the offline answer queue (persist / flush / retry with a fake submit and
  in-memory AsyncStorage) and en/fr locale parity (same keys, plural forms, placeholders, no
  empty strings).
- **Setup:** `jest` config in `package.json`; `jest.setup.ts` swaps native modules
  (Reanimated, Worklets, AsyncStorage) for the mocks their packages ship;
  `jest.globalSetup.js` pins the device time zone to `America/Toronto` so date tests behave the
  same on every machine.
- **Adding tests:** prefer pure functions (move logic out of components into a `.ts` file and
  test that). Mock the edges with `jest.mock` (API calls, query client), never the code under
  test. There are no component tests yet; if you add some, install
  `@testing-library/react-native` with `npx expo install @testing-library/react-native -- --dev`
  (PowerShell may swallow the `--`: check the package landed in `devDependencies`).

## Scripts

| Command                          | Description                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `npm start`                      | Start Metro for Expo Go (`expo start --go`)                                    |
| `npm run start:dev-client`       | Start Metro for the development build                                          |
| `npm run android`                | Start and open on Android                                                      |
| `npm run ios`                    | Start and open on iOS (simulator: macOS)                                       |
| `npm run web`                    | Start and open in the browser (port 8081)                                      |
| `npm test`                       | Unit tests (Jest with `jest-expo`)                                             |
| `npm run test:watch`             | Unit tests in watch mode                                                       |
| `npm run typecheck`              | TypeScript check (`tsc --noEmit`)                                              |
| `npm run lint`                   | ESLint via `expo lint`                                                         |
| `npm run format`                 | Prettier – format all files                                                    |
| `npm run format:check`           | Prettier – check only                                                          |
| `npx expo-doctor`                | Check dependencies and config                                                  |
| `npm run brand:render`           | Re-render icon/splash/favicon PNGs from `assets/brand/owl.svg` (docs/STORE.md) |
| `npx expo export --platform web` | Production web bundle into `dist/`                                             |

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

## Family plan purchases — RevenueCat setup

The Family plan is an auto-renewing subscription sold through the App Store and Google Play via
**RevenueCat** (`react-native-purchases`). The app user in RevenueCat is the **family**
(`family-{id}`, sent by the server as `revenuecat_app_user_id`), so one adult's purchase upgrades
everyone. The app never sets the tier: RevenueCat calls the backend webhook, and the app polls
`GET /family/subscription` (plus `POST /family/subscription/sync`) for up to ~30 s after buying.

Where it shows: Family tab → **Plan** card → **See the Family plan** — only for adult admins whose
policy allows purchases, only in an iOS/Android **development or store build** with the RevenueCat
keys set. On web, in Expo Go, or without keys the card keeps the disabled "Upgrade — coming soon"
button (store billing needs the native app; web billing is a later milestone).

1. **Store products** (needs the paid Apple Developer Program and a Google Play Console account):
   - App Store Connect → your app (`app.brainyclan`) → Subscriptions → a subscription group
     "Family plan" with three auto-renewable products (the B10 plans; same IDs on both stores):
     `brainyclan_family_monthly`, `brainyclan_family_6months` and `brainyclan_family_annual`.
     Fill in prices, display names and the review screenshot. Also sign the Paid Apps agreement
     (Business section), or products never load. **Introductory offers**: a 7-day free trial on
     the 6-month and annual products (Subscription → Subscription Prices → Introductory Offers →
     Free); the app shows a "7 days free trial" badge from the product, only when the account is
     still eligible. A _paid_ introductory offer (e.g. "founding families": 50% off the first
     year) is shown as the founding-families offer on that plan. **Offer codes** (Subscription →
     Offer Codes) can be redeemed in the app (paywall → "Redeem a store offer code" opens Apple's
     code sheet); map each code to an affiliate in the backend admin.
   - Google Play Console → your app (`app.brainyclan`) → Monetize → Subscriptions → products with
     the same IDs, each with a monthly / 6-month / yearly base plan. Play only lists products after an app
     build has been uploaded to a testing track (internal testing is enough). Free trials are
     **offers** on the base plan (eligibility "New customer acquisition", phase "Free trial",
     7 days); Play only returns offers the account can still get. **Promo codes** (Monetize →
     Promo codes) are redeemed in Google Play; the paywall's "Redeem a store offer code" opens
     `https://play.google.com/redeem`.
2. **RevenueCat project** (app.revenuecat.com, free to start):
   - Create a project "Brainy Clan", then add an **App Store app** (bundle ID `app.brainyclan`,
     plus an In-App Purchase Key from App Store Connect → Users and Access → Integrations) and a
     **Play Store app** (package `app.brainyclan`, plus a Google Cloud service-account JSON with
     access in Play Console — RevenueCat's guide walks through it).
   - Products: import the store products in both apps.
   - **Entitlement** with identifier exactly **`family`** (the backend's `REVENUECAT_ENTITLEMENT`)
     and attach all Family-plan products to it.
   - **Offering** (e.g. `default`), mark it **Current**, and add the packages **Monthly**
     (`$rc_monthly`), **Six month** (`$rc_six_month`) and **Annual** (`$rc_annual`) with the
     matching iOS and Android products (`brainyclan_family_monthly`, `brainyclan_family_6months`,
     `brainyclan_family_annual`). Use these package types: the app maps `MONTHLY`, `SIX_MONTH`
     and `ANNUAL` to its three plans (custom packages fall back to the product ID). The paywall
     shows annual first and highlighted, with the store's per-month price and the saving against
     the monthly plan computed from the store prices of the same offering (rounded down; nothing
     is hard-coded), then 6 months, then monthly.
3. **Webhook to the backend** (project → Integrations → Webhooks): URL
   `https://<public backend host>/api/v1/webhooks/revenuecat`, Authorization header value
   `Bearer <REVENUECAT_WEBHOOK_SECRET>` (same secret in the backend `.env`). For the faster
   tier switch, also give the backend a RevenueCat secret API key (`REVENUECAT_API_KEY`, see the
   backend README) — `POST /family/subscription/sync` then reads the subscriber directly.
   The backend must be reachable from the internet for webhooks (a tunnel such as `cloudflared`
   or `ngrok` works for a local Docker backend).
4. **API keys → env**: RevenueCat project → API keys → the **public** app-specific keys
   (`appl_…` for iOS, `goog_…` for Android) into `.env` locally and into the EAS environment
   variables (development / preview / production) for cloud builds:
   ```
   EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...
   ```
   These are public SDK keys (safe in the app); never put a secret key in an `EXPO_PUBLIC_` var.
5. **Legal links** (required by both stores on a subscription screen): the paywall opens the
   backend's `GET /legal` pages, else `EXPO_PUBLIC_TERMS_URL` / `EXPO_PUBLIC_PRIVACY_URL`, which
   default to `https://brainyclan.com/terms` and `https://brainyclan.com/privacy` (the website,
   `EXPO_PUBLIC_WEBSITE_URL`). The privacy policy URL is also needed in both store listings.
6. **Development build** (purchases never work in Expo Go or on web):
   `npx eas-cli@latest build --profile development --platform ios|android`, install it, then
   `npm run start:dev-client`. No config plugin is needed for RevenueCat.
7. **Test accounts**:
   - iOS: App Store Connect → Users and Access → **Sandbox** → add a sandbox tester; on the
     iPhone, Settings → App Store → Sandbox Account. Sandbox renewals are fast (a month ≈ 5 min).
   - Android: Play Console → Settings → **License testing** → add your Google account; install
     the build from the internal testing track (or the dev build signed with the same key) and use
     that account in the Play Store. Test cards never charge.
8. **Check on the phone**: sign in as an adult admin of a free family → Family → Plan → **See the
   Family plan** → three plans with store prices, Yearly highlighted with "Save N%" and the
   per-month price, trial badges → pick Yearly → **Subscribe** → store sheet → after paying,
   "Activating the Family plan…" then the celebration; the Plan card shows **Family** and the
   limits are gone. Also try: cancel the store sheet ("Purchase cancelled — nothing was charged"),
   **Restore purchases** on a second device, and a teen/child (no paywall entry).
9. **Plans bought on the web, codes and the web link (F8 / backend B10)**:
   - A family whose plan was bought on the website (`GET /family/subscription` → `store: "paddle"`)
     sees "Your Family plan is managed on the web" instead of the plans; **Manage subscription**
     (paywall and Plan card) opens the link from `POST /family/subscription/manage-link` (Paddle
     portal in the in-app browser, store subscription pages in the store app).
   - **Referral codes**: "Have a code?" at parent sign-up (kept on the device until the family is
     created, then sent with `POST /family/referral-code`) and on the paywall. Refused codes show
     a friendly message (`referral_code_invalid` / `referral_code_locked`).
   - **Web checkout link**: the app reads the store country (RevenueCat `getStorefront()`) and
     asks `GET /family/web-checkout/availability?storefront=…`; only when the server answers
     `link_allowed: true` does the paywall show "Also available on the web". The server list is
     empty by default, so the app shows no web prices or links anywhere until Moe enables a
     storefront (e.g. `USA`) after re-checking the store rules.

## Rewarded ads — AdMob setup

Free-tier adults (and teens, if the server policy allows it) can watch a short **rewarded video**
for a second chance after losing all lives. The server decides who may see ads
(`policy.second_chance.ad_allowed`, per session `second_chance.ad_available`); **children never
see ads**. Only **non-personalized** ads are requested (`requestNonPersonalizedAdsOnly`), rated
**G**, so there is no tracking and no App Tracking Transparency prompt. The option is hidden on
web, in Expo Go and in release builds without an ad unit. Where the law requires it (EU/EEA, UK,
Switzerland, some US states), Google's **UMP consent message** is shown right before the first
ad (step 7). AdMob's **blocking controls** (step 8) keep sensitive ad categories out as a second
guard.

How the reward is verified: the app creates a random `reward_ref` (UUID), passes it to AdMob as
server-side verification (SSV) custom data `"<reward_ref>:<session_id>"` with user id = member
id. AdMob calls the backend's SSV callback; the app then calls
`POST /play/sessions/{id}/second-chance` with `method: "ad"` and retries every 2 s for up to
~20 s while the server answers 409 `ad_reward_pending` ("Checking your reward…").

1. **AdMob account** (admob.google.com) → **Apps** → add the iOS app and the Android app
   (once they are in the stores you can link them; before that, add them as unpublished). Note
   each **App ID** (`ca-app-pub-…~…`).
2. **Rewarded ad unit** per app (Ad units → Add → Rewarded). Note each **ad unit ID**
   (`ca-app-pub-…/…`). In the ad unit's settings turn on **Server-side verification** with the
   callback URL `https://<public backend host>/api/v1/webhooks/admob-ssv` (must be public HTTPS;
   use a tunnel for a local backend) and use the **Verify URL** button to check it.
3. **Env** (`.env` and EAS environment variables):
   ```
   ADMOB_IOS_APP_ID=ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy
   ADMOB_ANDROID_APP_ID=ca-app-pub-xxxxxxxxxxxxxxxx~zzzzzzzzzz
   EXPO_PUBLIC_ADMOB_REWARDED_IOS=ca-app-pub-xxxxxxxxxxxxxxxx/1111111111
   EXPO_PUBLIC_ADMOB_REWARDED_ANDROID=ca-app-pub-xxxxxxxxxxxxxxxx/2222222222
   ```
   The app IDs are build-time values (`app.config.ts` passes them to the
   `react-native-google-mobile-ads` config plugin) — changing them needs a **new build**. Without
   them, Google's sample app IDs are used and, in development builds, Google's sample rewarded
   units (always-filled test ads). Note: sample ad units don't call your SSV URL, so the reward
   check then ends in "We couldn't confirm your reward yet" — for an end-to-end test use your
   real ad unit with SSV on and the phone registered as a test device.
4. **Test devices** (never click your own live ads): AdMob → Settings → Test devices → add the
   phone (Android: the advertising ID from Settings → Google → Ads; iOS: the IDFA shown in the
   Xcode/device log line "To get test ads on this device…"). Test devices get labelled test ads
   from real ad units, including the SSV callback.
5. **Development build**: `npx eas-cli@latest build --profile development --platform ios|android`
   (AdMob never works in Expo Go), then `npm run start:dev-client`.
6. **Store privacy answers** for non-personalized ads:
   - Apple App Privacy: AdMob still collects device identifiers/usage for ads delivery,
     frequency capping and fraud prevention — declare "Identifiers → Device ID" and "Usage Data →
     Advertising Data" as used for **Third-Party Advertising**, **not linked** to the user and
     **not used for tracking**. No ATT prompt is shown because nothing tracks. Add Google's
     privacy manifest notes if App Review asks (the SDK ships its own `PrivacyInfo.xcprivacy`).
   - Google Play Data safety: declare "Device or other IDs" collected and shared for advertising
     by the AdMob SDK; the app contains ads ("Contains ads" = yes). Because children use the app,
     Google Play's **Families policy** applies: the target audience includes under-13s
     (docs/STORE.md §6), so Play requires a Families self-certified ad SDK (AdMob is), ads rated
     G (done in code + step 8), the Families ads declaration, and no ads to children — the server
     never allows a child an ad, so a child's device never requests one.
   - EU/UK users: non-personalized ads still need consent for cookies/identifiers under GDPR —
     the app asks with Google's UMP consent message (step 7).
7. **Consent message (Google UMP, AdMob → Privacy & messaging)**. The app uses the `AdsConsent`
   API of react-native-google-mobile-ads (`src/features/play/adConsent.ts`); the message itself
   is designed and published in AdMob, no app change needed:
   1. AdMob → **Privacy & messaging** → **European regulations** (GDPR) → **Create message**.
      Select **both apps** (the message is linked to the AdMob **app IDs** from step 1 — the app
      must be built with those real IDs, not Google's sample IDs, or no message is found), the
      languages (**English** and **French**), your privacy policy URL, and the ad partners
      (keep Google's default list unless you add mediation). The GDPR message covers the EEA,
      the UK and Switzerland. Leave "Close (do not consent)" off unless a lawyer asks for it.
      **Publish** the message.
   2. Optional, for US users: **US state regulations** → create and publish a message for both
      apps (an opt-out "Do not sell or share" message; with non-personalized ads it is mostly a
      formality — decide with the lawyer).
   3. Do **not** create the "IDFA explainer" (iOS ATT) message: the app never asks for ATT (see
      "iOS: no App Tracking Transparency prompt" below).
   4. **Test it** in a development build: install, try a rewarded ad once and look in the device
      log (Xcode console / `adb logcat`) for the UMP line with the **hashed device ID**
      (`... setTestDeviceIdentifiers(...) ... "<HASH>"` / `addTestDeviceHashedId("<HASH>")`).
      Put it in `.env` with a debug region and restart Metro:
      ```
      EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS=33BE2250B43518CCDA7DE426D04EE231
      EXPO_PUBLIC_ADMOB_CONSENT_DEBUG_GEOGRAPHY=EEA
      ```
      (`EEA`, `NOT_EEA`, `REGULATED_US_STATE` or `OTHER`; only used in development builds and only
      on the listed devices). To see the message again, delete and reinstall the app (consent is
      stored on the device).
   5. **How the app behaves**: nothing at app start. Only when a member whose policy allows ads
      taps **Watch a short video** does the app check consent (`requestInfoUpdate` +
      `loadAndShowConsentFormIfRequired`, with the member's `tagForUnderAgeOfConsent`); the
      message appears only where required and only the first time. The answer is cached for
      the app session. If ads may not be requested (`canRequestAds` false, or the check fails
      offline without an earlier answer), the app shows "No video is available right now" and
      the other second-chance options stay available — play is never blocked. Ads are still
      requested non-personalized (`policy.ad_request`). Children never see the message (the
      server never allows them ads), nor does web or Expo Go. Where UMP requires a way to change
      the choice later, **Profile → Privacy → Privacy choices for ads** appears (it opens
      Google's privacy options form); elsewhere the row is hidden.
   6. **iOS: no App Tracking Transparency prompt.** The app requests non-personalized / limited
      ads and never reads the IDFA, so it does not call the ATT API, the config has no
      `NSUserTrackingUsageDescription` (no `userTrackingUsageDescription` plugin option in
      `app.config.ts`), and App Store privacy answers say "not used for tracking". If the policy
      ever allows personalized ads on iOS, an ATT prompt (and that Info.plist string) must be
      added first.
8. **Blocking controls (AdMob → Blocking controls)** — a second guard on top of the code, so a
   family app never shows an unsuitable ad even if a request were mis-tagged. **Children never see
   ads at all** (the server policy never allows them; no ad request is made for a child), so these
   settings only shape what teens and adults on the free tier can see:
   1. **Content → Sensitive categories**: block every category that can be blocked, at least
      **Dating**, **Gambling & betting** (including sports betting, lotteries, social casino
      games), **Alcohol**, **Politics**, **Religion**, **Get rich quick**, **Sexual & reproductive
      health**, **Weight loss**, **Cosmetic procedures & body modification**, **Drugs &
      supplements**, **References to sex & sexuality**, **Sensational & shocking**, **Black magic,
      astrology & esoteric**, **Personal loans** / **Cryptocurrencies** (financial), and
      **Firearms & weapons** where offered. Google's list changes; when in doubt, block.
   2. **Content → General categories**: leave allowed (they are ordinary ads), but review the list
      once for anything that doesn't fit a family app.
   3. **Content → Max ad content rating**: set **G** at the **app level** for both apps (Apps →
      the app → Blocking controls, or account level if every app is a family app). The app already
      sends `maxAdContentRating: G` from `policy.ad_request` on each request; the AdMob setting
      enforces it even if a request weren't tagged.
   4. **Child-directed treatment**: AdMob → **Settings → Account → Tag for child-directed
      treatment** stays **off** at the account level (the app is mixed-audience; tagging every
      request as child-directed would block all ads for teens and adults). Child-directed and
      under-age-of-consent tags are set **per request** by the app from `policy.ad_request`
      (teens: `tagForUnderAgeOfConsent`; children never request ads). The contract's
      `ad_request` has no `tagForChildDirectedTreatment` today; if Google Play's Families review
      asks for it, add it to the contract and the app first.
   5. **Advertiser URLs / ad networks**: block competitor or problem advertisers as you notice
      them (Ad review center → block the ad). Keep **mediation off** (only Google's
      Families-certified demand); if mediation is ever added, use only Families self-certified
      networks.
   6. **Ad review center** (Blocking controls → Ad review center): check it once a week during
      the first months and block anything that slipped through.
9. **Check on the phone**: as an adult on the free tier, start a game, lose all lives → **Watch a
   short video** → "Loading the video…" → the ad plays → close it after the reward → "Checking
   your reward…" → the game continues with full lives. Closing the ad early shows "Watch the video
   to the end…" (no second chance). As a child, the option never appears. With the EEA debug
   region (step 7.4): the consent message appears before the first video only; choosing "Do not
   consent" still plays a (limited) ad or shows "No video is available"; Profile → Privacy →
   **Privacy choices for ads** reopens the choices.

## Push notifications — setup

The backend sends pushes through the **Expo push service** (goal reached, results, family
activity, daily reminder, family chat — a chat push never contains the message text). The app
(`src/features/notifications/push.ts`, `expo-notifications` plugin in `app.json`) asks for
permission from Profile → **Notifications**, gets an Expo push token and sends it with
`PUT /me/push-token`. Push is skipped silently on web, in Expo Go, on simulators/emulators and
while the app has no EAS `projectId`.

1. **EAS project:** `npx eas-cli@latest login`, then `npx eas-cli@latest init` — it writes
   `extra.eas.projectId` into `app.json`, which push (and OTA updates) need. Commit that change.
2. **iOS — APNs key:** `npx eas-cli@latest credentials` → iOS → production (and development) →
   **Push Notifications** → let EAS create an APNs key with your Apple Developer account (or
   upload a `.p8` key from developer.apple.com → Keys with "Apple Push Notifications service"
   enabled). One key works for every app of the team.
3. **Android — FCM V1:** in the [Firebase console](https://console.firebase.google.com) create a
   project and add an Android app with package `app.brainyclan`.
   - Project settings → Service accounts → **Generate new private key** (JSON), then
     `npx eas-cli@latest credentials` → Android → **Google Service Account** → "Manage your
     Google Service Account Key for Push Notifications (FCM V1)" → upload it. Never commit the
     key.
   - The app also needs Firebase's client config: download `google-services.json` and point
     `android.googleServicesFile` at it in `app.json` (not configured in the repo yet; it is a
     native change, so a new build is needed). It contains no secrets but is project-specific.
4. **Backend:** nothing to configure; optional `EXPO_ACCESS_TOKEN` only with Expo's enhanced push
   security (backend README "Expo push notifications").
5. **Check on a real device** with a development or store build: Profile → Notifications → allow
   → the app registers the token for this device; trigger a push (e.g. send a chat
   message from another member, or reach a goal). Tapping a chat push opens the Chat tab, a goal
   push opens the goal. Quiet hours and per-type switches are applied by the server.

## Error monitoring — Sentry setup

The app reports crashes and unhandled JS errors to [Sentry](https://sentry.io) with
`@sentry/react-native` (iOS, Android and web). It is **off unless `EXPO_PUBLIC_SENTRY_DSN` is set**
(`src/features/app/sentry.ts`).

Privacy (family app with children): `sendDefaultPii: false`; request bodies, headers (Bearer
token), cookies and query strings are stripped from events and breadcrumbs; console breadcrumbs
lose their text; no screenshots or view hierarchy; no performance tracing. The only user field is
the **family member id** — never a nickname, display name or email, for children and adults alike.

### Step 1 – project and DSN

1. Create a Sentry organization (or use yours) and a project of platform **React Native**, e.g.
   `brainy-clan-app`. Data region: pick the EU region if most families are in the EU.
2. Project → Settings → Client Keys (DSN) → copy the DSN. It is public (it ships in the app), so
   it can live in `.env` and EAS environment variables:
   `EXPO_PUBLIC_SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project>`.
3. Restart Metro with `--clear`. To check: throw a test error from a dev screen and see it in
   Sentry (development events are tagged `environment: development`).

### Step 2 – readable stack traces (source maps with EAS)

`metro.config.js` uses Sentry's serializer (Debug IDs in bundles). The upload runs during EAS
builds through the `@sentry/react-native/expo` config plugin, which `app.config.ts` adds only when
`SENTRY_ORG` and `SENTRY_PROJECT` are set:

1. Sentry → Settings → Auth Tokens → create an **organization token** (scope: project releases /
   source maps upload).
2. Store it as an **EAS secret**, never in `.env`, `eas.json` or the repo:
   `npx eas-cli@latest env:create --name SENTRY_AUTH_TOKEN --value <token> --visibility secret --environment production --environment preview`.
3. Add plain EAS variables `SENTRY_ORG` (organization slug) and `SENTRY_PROJECT`
   (`brainy-clan-app`), plus `EXPO_PUBLIC_SENTRY_DSN`, for the `preview` and `production`
   environments. Leave `SENTRY_ORG`/`SENTRY_PROJECT` unset for `development` builds (no upload).
4. Build (`eas build --profile production`); the build log shows "Sentry: uploading source maps".
   For OTA updates run `npx sentry-expo-upload-sourcemaps dist` after `eas update` (with
   `SENTRY_AUTH_TOKEN` in the shell environment only).

If a build fails on the Sentry upload step, check the token, or unset `SENTRY_ORG` /
`SENTRY_PROJECT` for that environment to build without the upload.

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

RevenueCat web billing (subscriptions on the web version; planned as Paddle web checkout, PLAN
F8). Push notifications, RevenueCat and AdMob are native modules and need the EAS development build
(see above). See `CLAUDE.md` for architecture rules.
