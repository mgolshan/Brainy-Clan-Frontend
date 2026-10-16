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

| Command                          | Description                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `npm start`                      | Start Metro for Expo Go (`expo start --go`)                                    |
| `npm run start:dev-client`       | Start Metro for the development build                                          |
| `npm run android`                | Start and open on Android                                                      |
| `npm run ios`                    | Start and open on iOS (simulator: macOS)                                       |
| `npm run web`                    | Start and open in the browser (port 8081)                                      |
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
     "Family plan" with two auto-renewable products, e.g. `brainyclan_family_monthly` and
     `brainyclan_family_annual`. Fill in prices, display names and the review screenshot. Also
     sign the Paid Apps agreement (Business section), or products never load.
   - Google Play Console → your app (`app.brainyclan`) → Monetize → Subscriptions → products with
     the same IDs, each with a monthly / yearly base plan. Play only lists products after an app
     build has been uploaded to a testing track (internal testing is enough).
2. **RevenueCat project** (app.revenuecat.com, free to start):
   - Create a project "Brainy Clan", then add an **App Store app** (bundle ID `app.brainyclan`,
     plus an In-App Purchase Key from App Store Connect → Users and Access → Integrations) and a
     **Play Store app** (package `app.brainyclan`, plus a Google Cloud service-account JSON with
     access in Play Console — RevenueCat's guide walks through it).
   - Products: import the store products in both apps.
   - **Entitlement** with identifier exactly **`family`** (the backend's `REVENUECAT_ENTITLEMENT`)
     and attach all Family-plan products to it.
   - **Offering** (e.g. `default`), mark it **Current**, and add the packages **Monthly**
     (`$rc_monthly`) and **Annual** (`$rc_annual`) with the matching iOS and Android products. The
     app shows the current offering's packages with the store's localized prices, yearly first.
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
5. **Legal links** (required by both stores on a subscription screen): set
   `EXPO_PUBLIC_TERMS_URL` and `EXPO_PUBLIC_PRIVACY_URL` (the links are hidden until set; Apple's
   standard EULA `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/` is fine as
   terms of use if you have no own terms yet). The privacy policy URL is also needed in both store
   listings.
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
   Family plan** → prices show → pick Yearly → **Subscribe** → store sheet → after paying,
   "Activating the Family plan…" then the celebration; the Plan card shows **Family** and the
   limits are gone. Also try: cancel the store sheet ("Purchase cancelled — nothing was charged"),
   **Restore purchases** on a second device, and a teen/child (no paywall entry).

## Rewarded ads — AdMob setup

Free-tier adults (and teens, if the server policy allows it) can watch a short **rewarded video**
for a second chance after losing all lives. The server decides who may see ads
(`policy.second_chance.ad_allowed`, per session `second_chance.ad_available`); **children never
see ads**. Only **non-personalized** ads are requested (`requestNonPersonalizedAdsOnly`), rated
**G**, so there is no tracking and no App Tracking Transparency prompt. The option is hidden on
web, in Expo Go and in release builds without an ad unit.

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
     Google Play's **Families policy** applies: keep ads rated G (done in code), and choose the
     target audience carefully (if under-13s are a target audience, Play requires Families
     self-certified ad SDKs and child-directed settings — the app already never shows ads to
     children, which the server enforces).
   - EU/UK users: non-personalized ads still need consent for cookies/identifiers under GDPR —
     set up a **Google UMP consent message** (AdMob → Privacy & messaging) before releasing there.
     The consent form is not built yet (see `docs/PROGRESS.md`).
7. **Check on the phone**: as an adult on the free tier, start a game, lose all lives → **Watch a
   short video** → "Loading the video…" → the ad plays → close it after the reward → "Checking
   your reward…" → the game continues with full lives. Closing the ad early shows "Watch the video
   to the end…" (no second chance). As a child, the option never appears.

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

RevenueCat web billing (subscriptions on the web version) and the EU consent form for ads. Push
notifications, RevenueCat and AdMob are native modules and need the EAS development build (see
above). See `CLAUDE.md` for architecture rules.
