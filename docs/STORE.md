# Brainy Clan — store release kit

Everything needed to put Brainy Clan on the App Store and Google Play that does not need the store
accounts themselves: app identity, build/update setup, listing texts (English + French), age
rating and privacy answers, screenshot plan, review notes and a step-by-step checklist.

**Before submitting:** the privacy policy and terms (served by the backend at `/legal/privacy` and
`/legal/terms`) must be reviewed by a lawyer and published with `LEGAL_DRAFT=false`. The answers
below describe what the app does today (F7, 2026-10-16); re-check them whenever a feature or SDK
changes what is collected.

## 1. App identity

| Setting             | Value                                                                      | Where                         |
| ------------------- | -------------------------------------------------------------------------- | ----------------------------- |
| Name                | Brainy Clan                                                                | `app.json` `name`             |
| Slug                | `brainy-clan`                                                              | `app.json` `slug`             |
| URL scheme          | `brainyclan` (+ `fb<APP_ID>` when Facebook is configured)                  | `app.json` / `app.config.ts`  |
| iOS bundle ID       | `app.brainyclan` (also the Apple `aud` for Sign in with Apple)             | `ios.bundleIdentifier`        |
| Android package     | `app.brainyclan`                                                           | `android.package`             |
| Marketing version   | `1.0.0` — bump by hand for each store release (`expo.version`)             | `app.json` `version`          |
| Build numbers       | iOS `buildNumber` / Android `versionCode` managed by EAS (remote, auto +1) | `eas.json` `appVersionSource` |
| Runtime version     | `fingerprint` policy (changes whenever native code/config changes)         | `app.json` `runtimeVersion`   |
| Orientation         | Portrait                                                                   | `orientation`                 |
| Dark mode           | Follows the system (`userInterfaceStyle: automatic`)                       |                               |
| iPad                | Not a native iPad app in v1 (`supportsTablet: false`; runs in iPhone mode) | `ios.supportsTablet`          |
| Encryption          | `ITSAppUsesNonExemptEncryption: false` (HTTPS only → no export paperwork)  | `ios.infoPlist`               |
| iOS usage strings   | None needed: no camera, photos, location, contacts, microphone, Face ID    |                               |
| Android permissions | INTERNET, VIBRATE, notifications, billing, AD_ID/network state from SDKs   | `android.blockedPermissions`  |

Removed defaults: `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE` (the data export is written
to the app cache and shared via the share sheet, so no storage permission is needed) and the Face ID
string that expo-secure-store adds by default (the app doesn't use biometrics). `RECORD_AUDIO` is not
requested by any installed module. Libraries add their own permissions when building:
`POST_NOTIFICATIONS` (expo-notifications), `com.android.vending.BILLING` (RevenueCat),
`com.google.android.gms.permission.AD_ID` + `ACCESS_NETWORK_STATE` (AdMob). Check the merged
manifest of the first production build (`eas build` logs or `npx expo prebuild -p android` in a
throw-away copy) against this list.

## 2. Builds, channels and over-the-air updates

`eas.json` profiles:

| Profile                 | Use                                     | Distribution               | Update channel |
| ----------------------- | --------------------------------------- | -------------------------- | -------------- |
| `development`           | Dev client for daily native work        | internal (ad hoc / APK)    | `development`  |
| `development-simulator` | Same, iOS simulator build               | internal                   | `development`  |
| `preview`               | Testers (family/waitlist), release-like | internal (ad hoc iOS, APK) | `preview`      |
| `production`            | TestFlight / App Store, Play tracks     | store (AAB / IPA)          | `production`   |

- `appVersionSource: remote` + `autoIncrement` on `production`: EAS stores and bumps the iOS build
  number / Android version code; `expo.version` (1.0.0) stays the marketing version you set.
  First time only: `npx eas-cli@latest build:version:set` to seed the remote counters if EAS asks.
- **OTA updates (expo-updates):** installed. After `eas init` writes `extra.eas.projectId` into
  `app.json`, `app.config.ts` derives `updates.url` (`https://u.expo.dev/<projectId>`); until
  then updates are simply off. Publish JS-only fixes with
  `npx eas-cli@latest update --channel production --environment production --message "…"`.
  Because `runtimeVersion` uses the **fingerprint** policy, an update only reaches builds whose
  native code matches; any native change (new module, plugin config, env var that changes
  `app.config.ts`, e.g. a Google client ID) needs a new store build. Use the same EAS environment
  for the build and its updates.
- Submit profile `production`: iOS `ascAppId` / `appleTeamId` are placeholders
  (`REPLACE_WITH_…`) to fill once the App Store Connect app exists; Android submits to the
  **internal** track as a **draft** (Play requires draft releases until the app has been reviewed
  once). Upload the Google service-account key to EAS (`eas credentials`) instead of committing it.

## 3. Brand assets

- Mascot "Ollie" the owl: `assets/brand/owl.svg` (original, geometric; orange owl on brand blue
  `#1D6FD8`). **Needs Moe's approval** — it replaces the Expo template icon.
- `npm run brand:render` (`scripts/render-brand.mjs`, devDependency `@resvg/resvg-js`) renders:
  `assets/images/icon.png` (1024², opaque), Android adaptive `android-icon-foreground.png` /
  `-background.png` / `-monochrome.png` (1024², owl inside the 66/108 safe circle),
  `splash-icon.png` (transparent, shown 200 dp wide on `#1D6FD8`, dark `#10233F`),
  `favicon.png` (48²) and `assets/images/store/play-feature-graphic.png` (1024×500), plus
  `assets/brand/icon.svg` for marketing. Change the SVG, re-run the script, rebuild.
- Store icons: App Store Connect takes the icon from the build; Play Console needs a 512² PNG —
  export it from `assets/images/icon.png` (resize to 512², no transparency, Play adds the mask).

## 4. Store listing — English

**App name (30):** Brainy Clan
**Subtitle (iOS, 30):** Family Brain Challenges
**Short description (Play, 80):** Quizzes, puzzles and family goals for every age — from kids to grandparents.

**Promotional text (iOS, 170):**
Play together, learn together. Daily quizzes, sudoku, math sprints and word puzzles for every
age in your family — with shared goals and a friendly family leaderboard.

**Description:**

> Brainy Clan turns a few minutes a day into a family habit. Everyone plays at their own level —
> kids, teens, parents and grandparents — and the whole clan cheers each other on.
>
> **Play your way**
> • Quizzes in many categories, with wisdom cards that teach something new
> • Sudoku (4×4 up to 9×9), Math Sprint and word puzzles (anagrams, missing letters, word search)
> • Questions adapt to each player's age group and difficulty
> • Second chances and a "redemption" round when you slip up
>
> **Made for families**
> • One family, many players: invite kids with just a nickname — no email, no real name
> • Kids sign in with a one-time code from a parent's phone
> • A look for every age: playful for kids, sleek for teens, calm and clear for adults, extra
> readable for seniors — with adjustable text size and reduced motion
>
> **Goals and friendly competition**
> • Set daily, weekly or monthly family goals — race each other or team up
> • Weekly family leaderboard and personal stats
> • Gentle reminders with quiet hours
>
> **Privacy first**
> • Children's profiles keep only what the game needs; a parent consents for them
> • No ads for children; adults on the free plan may see optional rewarded videos (never
> personalized)
> • Download your data or delete your account at any time in the app
>
> Brainy Clan Family plan: unlock more members, categories and goals for the whole family with
> one subscription. Payment is charged to your App Store / Google Play account and renews
> automatically unless cancelled at least 24 hours before the end of the period. Manage or cancel
> in your account settings.
>
> Terms: <https://…/legal/terms> · Privacy: <https://…/legal/privacy>

**Keywords (iOS, 100):** `family,quiz,trivia,brain games,kids,learning,puzzle,sudoku,math,word,goals,leaderboard`

**What's new (1.0.0):** First release — quizzes, sudoku, math sprint and word puzzles for the whole family.

## 5. Store listing — French (Canada / France)

**Nom de l'app (30) :** Brainy Clan
**Sous-titre (iOS, 30) :** Défis cérébraux en famille
**Description courte (Play, 80) :** Quiz, énigmes et objectifs à jouer en famille — des enfants aux grands-parents.

**Texte promotionnel (iOS, 170) :**
Jouer ensemble, apprendre ensemble. Quiz du jour, sudoku, sprints de calcul et jeux de mots pour
tous les âges de la famille — avec des objectifs communs et un classement familial.

**Description :**

> Brainy Clan transforme quelques minutes par jour en habitude familiale. Chacun joue à son
> niveau — enfants, ados, parents et grands-parents — et tout le clan s'encourage.
>
> **Jouez à votre façon**
> • Des quiz dans de nombreuses catégories, avec des cartes « sagesse » pour apprendre
> • Sudoku (du 4×4 au 9×9), Sprint de calcul et jeux de mots (anagrammes, lettre manquante, mots
> cachés)
> • Des questions adaptées à la tranche d'âge et au niveau de chaque joueur
> • Une deuxième chance et une manche de rattrapage en cas d'erreur
>
> **Pensé pour les familles**
> • Une famille, plusieurs joueurs : invitez les enfants avec un simple surnom — sans courriel ni
> vrai nom
> • Les enfants se connectent avec un code à usage unique créé sur le téléphone d'un parent
> • Un style pour chaque âge : ludique pour les enfants, épuré pour les ados, clair pour les
> adultes, très lisible pour les aînés — taille du texte et animations réglables
>
> **Objectifs et compétition amicale**
> • Fixez des objectifs quotidiens, hebdomadaires ou mensuels — en course ou en équipe
> • Classement familial de la semaine et statistiques personnelles
> • Rappels discrets avec heures de silence
>
> **La vie privée d'abord**
> • Les profils des enfants ne gardent que le nécessaire ; un parent donne son consentement
> • Aucune publicité pour les enfants ; les adultes du forfait gratuit peuvent voir des vidéos
> récompensées facultatives (jamais personnalisées)
> • Téléchargez vos données ou supprimez votre compte à tout moment dans l'app
>
> Forfait Famille Brainy Clan : plus de membres, de catégories et d'objectifs pour toute la
> famille avec un seul abonnement. Le paiement est débité de votre compte App Store / Google Play
> et se renouvelle automatiquement sauf annulation au moins 24 heures avant la fin de la période.
> Gérez ou annulez l'abonnement dans les réglages de votre compte.
>
> Conditions : <https://…/legal/terms?lang=fr> · Confidentialité : <https://…/legal/privacy?lang=fr>

**Mots-clés (iOS, 100) :** `famille,quiz,jeu,cerveau,enfants,apprendre,énigme,sudoku,maths,mots,objectifs,classement`

**Nouveautés (1.0.0) :** Première version — quiz, sudoku, sprint de calcul et jeux de mots pour toute la famille.

## 6. Category, audience and age rating

- **App Store:** primary category **Education**, secondary **Games** (subcategories Family,
  Trivia, Puzzle). **Not** in the Kids Category: Kids Category apps may not contain third-party
  advertising or analytics and need a parental gate before any purchase or external link;
  Brainy Clan is a family (mixed-audience) app with ads for adults, RevenueCat and Sentry.
  Children use it inside a parent-managed family (parent creates the child profile and consents).
- **Google Play:** category **Education** (tags: Family, Trivia, Puzzle, Educational). In
  "Target audience and content" select the age groups the app is designed for — if they include
  under-13s (5–8, 9–12), the **Families Policy** applies: only Families-certified ad SDKs
  (AdMob is), no ads to children (the policy's `ads_allowed` is false for children), no
  personalized ads to anyone (all ad requests are non-personalized; teens are also tagged
  `tagForUnderAgeOfConsent` and capped by `maxAdContentRating` from `policy.ad_request`), and the
  Families ads declaration. Answer
  "appeals to children: yes" and "mixed audience".
- **Age rating, Apple questionnaire** (expected **4+**): no violence, horror, profanity, sexual
  content, drugs, alcohol, gambling or simulated gambling, no medical/treatment info; no
  unrestricted web access (the in-app browser only opens the legal pages and sign-in providers);
  no user-generated content shared outside the family (nicknames/avatars are visible only to the
  family; no chat); contests: no; advertising: **yes** (rewarded ads, adults/teens on the free
  plan only, non-personalized); in-app purchases: yes; age assurance: birth year/month asked at
  sign-up, policies decided by the backend.
- **Age rating, Google IARC** (expected **Everyone / PEGI 3 / ESRB E**): category "Game or
  reference/education"; violence none; fear none; sexuality none; gambling none; language none;
  controlled substances none; crude humour none. Interactive elements: **In-app purchases**,
  **Users interact** (family leaderboard inside a private family — answer "no" to unrestricted
  chat), **Shares location: no**, **Digital purchases: yes**.

## 7. Privacy answers

What the app and its SDKs actually process (2026-10-16). Children: only nickname, avatar, birth
year/month, gameplay, settings and device/sign-in records; no email, no social sign-in, no ads, no
purchases (the backend policy decides; an email login is only possible for bands whose policy allows
it); a push token only when notifications are turned on for that device.

### Apple — App Privacy ("nutrition label")

Tracking: **No** (no ATT prompt; ads are non-personalized; no data shared with data brokers).

| Data type                        | Collected by            | Purpose(s)                              | Linked to user  | Tracking |
| -------------------------------- | ----------------------- | --------------------------------------- | --------------- | -------- |
| Contact info → Email address     | Backend (adults, teens) | App functionality (account, sign-in)    | Yes             | No       |
| Contact info → Name              | Backend (display name)  | App functionality                       | Yes             | No       |
| User content → Other             | Backend (avatar choice) | App functionality                       | Yes             | No       |
| Identifiers → User ID            | Backend, Sentry, RC     | App functionality, analytics (crashes)  | Yes             | No       |
| Identifiers → Device ID          | AdMob (adults/teens)    | Third-party advertising (non-personal.) | No              | No       |
| Purchases → Purchase history     | RevenueCat, App Store   | App functionality                       | Yes             | No       |
| Usage data → Product interaction | Backend (gameplay)      | App functionality                       | Yes             | No       |
| Usage data → Advertising data    | AdMob                   | Third-party advertising                 | No              | No       |
| Diagnostics → Crash data         | Sentry                  | App functionality                       | Yes (member id) | No       |
| Diagnostics → Performance data   | Sentry (errors only)    | App functionality                       | Yes             | No       |
| Other → Birth year/month         | Backend                 | App functionality (age-appropriate)     | Yes             | No       |

Not collected: location, contacts, photos, health, financial info (store handles payment),
browsing history, search history, sensitive info, audio, precise identifiers for tracking.
Sentry runs with `sendDefaultPii: false` and scrubs events; traces are off.

### Google Play — Data safety

- Data encrypted in transit: **Yes** (HTTPS). Users can request deletion: **Yes** (in-app
  Profile → Privacy → Delete account; also needs a **web URL** for deletion requests — see open
  questions). Data shared with third parties: **Yes** for AdMob (device/advertising ID and
  ad interaction for adults/teens on the free plan, non-personalized) — everything else goes
  to service providers acting on our behalf (Sentry, RevenueCat), which Play does not count as
  "sharing".
- Collected (all "required for the app" unless noted; none "optional"; purposes in brackets):
  Personal info → **Email** (account management), **Name** (app functionality), **Other info:
  birth year/month** (app functionality); Financial info → **Purchase history** (app
  functionality); App activity → **App interactions** (app functionality), **Other actions**
  (gameplay answers, goals); App info and performance → **Crash logs**, **Diagnostics**
  (analytics: crash reporting); Device or other IDs → **Device or other IDs** (advertising, fraud
  prevention — AdMob; push token for notifications).
- Not collected: location, contacts, photos/videos, audio, files, calendar, health, messages,
  web browsing.

## 8. Screenshot plan

Same scenes in English and French (Play: per language; App Store: per localization). Use the
seeded demo family with friendly names; light mode; status bar clean (9:41, full battery).

| #   | Scene                                             | Theme   | Caption (EN / FR)                                                  |
| --- | ------------------------------------------------- | ------- | ------------------------------------------------------------------ |
| 1   | Home: greeting, stats, weekly leaderboard         | modern  | The whole family, one brainy clan / Toute la famille, un clan futé |
| 2   | Play categories                                   | playful | Quizzes for every age / Des quiz pour tous les âges                |
| 3   | Multiple choice with correct-answer feedback      | playful | Learn something new every day / Apprenez chaque jour               |
| 4   | Sudoku 6×6 in progress                            | sleek   | Sudoku, math and word puzzles / Sudoku, calcul et jeux de mots     |
| 5   | Goal race (competition) with countdown            | modern  | Set goals together / Des objectifs à relever ensemble              |
| 6   | Family tab with members and invite                | modern  | Kids join with a nickname / Les enfants rejoignent avec un surnom  |
| 7   | Classic theme, large text                         | classic | Easy to read for grandparents / Lisible pour les grands-parents    |
| 8   | Profile → Privacy (download data, delete account) | modern  | Your data, your choice / Vos données, votre choix                  |

Sizes: **iPhone 6.9"** (1320×2868, required; Apple scales it down for smaller iPhones). No iPad
set needed while `supportsTablet` is false. **Google Play phone**: 1080×1920 or larger, 2–8
images (use the same 8); feature graphic `assets/images/store/play-feature-graphic.png`
(1024×500); 512² icon. Optional later: 7"/10" tablet sets, a 30 s preview video.

Capture on a simulator/emulator with a preview build pointed at the staging backend, then add
captions in a frame tool (Figma/Canva/AppScreens) with the brand blue background.

## 9. Review notes (App Review / Play "App access")

Create a dedicated review family on the **production** backend before submitting (not the
`.test` seed), e.g. `review@brainyclan.app` with a strong password stored in the password
manager, a child "Sam" (9) and a teen "Alex" (14), a few completed sessions and one active goal.

> **Demo account:** email `review@…` / password `…` (adult family admin).
>
> **How to see the child experience:** Family tab → Sam → _Sign-in & devices_ → _Make a sign-in
> code_, then on the welcome screen tap _I have a sign-in code_ (on a second device, or sign out
> first). Children never see ads, purchases or external links; their parent consents when
> creating the profile.
>
> **Sign in with Apple** is offered next to Google and email sign-in. **Account deletion:**
> Profile → Privacy → Delete account (deletes the account, or the whole family for the owner).
> **Data export:** Profile → Privacy → Download my data.
>
> **Subscriptions:** Profile → Family plan (sandbox). **Ads:** only rewarded videos the adult
> chooses to watch for a second chance on the free plan; non-personalized; no App Tracking
> Transparency prompt because the app does not track.

Play Console "App access": "All or some functionality is restricted" → add the same credentials
and instructions.

## 10. Release checklist for Moe

**Accounts and one-time setup**

1. Apple Developer Program (organisation account if possible — the seller name shows on the
   store) and Google Play Console (one-time fee; new personal accounts must run a **closed test
   with at least 12 testers for 14 days** before production access).
2. `npx eas-cli@latest login`, then `npx eas-cli@latest init` (adds `extra.eas.projectId`;
   enables OTA updates automatically via `app.config.ts`).
3. App Store Connect: create the app (bundle ID `app.brainyclan`, SKU `brainyclan-ios`, primary
   language English (Canada or U.S.), add French). Put the app's **Apple ID** (`ascAppId`) and
   **Team ID** into `eas.json` → `submit.production.ios`.
4. Play Console: create the app (default language en-US or en-CA, add fr-CA/fr-FR), app or game:
   **App**, free, declarations. Create a Google Cloud service account with Play access and
   upload its JSON key to EAS (`npx eas-cli@latest credentials` → Android → Google Service
   Account), not to git.
5. EAS environment variables for `production` (and `preview`): `EXPO_PUBLIC_API_URL`
   (production HTTPS URL), social client IDs, `EXPO_PUBLIC_REVENUECAT_*`, `ADMOB_*_APP_ID`,
   `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`/`SENTRY_PROJECT` + secret `SENTRY_AUTH_TOKEN`,
   `EXPO_PUBLIC_TERMS_URL`/`EXPO_PUBLIC_PRIVACY_URL` if used. Push: APNs key and FCM V1 key in
   EAS credentials. See README sections for each service.
6. Backend: production deployment over HTTPS, `LEGAL_DRAFT=false` after the lawyer's review,
   RevenueCat + AdMob SSV webhooks pointing at production, review family created.

**iOS: EAS build → TestFlight → App Store**

1. `npx eas-cli@latest build --platform ios --profile production` (EAS manages certificates
   and the provisioning profile; build number auto-increments).
2. `npx eas-cli@latest submit --platform ios --profile production --latest` → appears in
   TestFlight after processing (~15–30 min). Answer the export compliance question: no
   (already declared in the Info.plist).
3. TestFlight: internal testers (your team) immediately; external testers (waitlist families)
   after a short Beta App Review — fill "What to test" and the demo account.
4. App Store Connect → the version: screenshots (6.9"), texts from §4/§5, keywords, support URL,
   marketing URL, privacy policy URL, App Privacy (§7), age rating (§6), category, in-app
   purchases/subscriptions attached to the version (first subscription must be submitted with
   the app), review notes + demo account (§9), "Sign in with Apple" capability enabled.
5. Submit for review. Apple will look closely at: account deletion in the app (yes), Sign in with
   Apple offered alongside Google (yes), subscription terms in the description and paywall
   (auto-renew text, links to terms/privacy), children's data and ads (not Kids Category; no ads
   for children), demo account working, no placeholder content.
6. After approval: release manually or automatically; then use phased release (7 days).

**Android: internal → closed → production**

1. `npx eas-cli@latest build --platform android --profile production` (AAB; EAS generates and
   keeps the upload keystore — back it up via `eas credentials`; enrol in Play App Signing).
2. The very first AAB must be uploaded **manually** in Play Console (Internal testing → Create
   release) so Play links the package name; afterwards
   `npx eas-cli@latest submit --platform android --profile production --latest` sends drafts to
   the internal track.
3. Complete "App content": privacy policy URL, app access (§9), ads: **contains ads**, content
   rating (§6), target audience (§6, Families Policy if under-13 selected), data safety (§7),
   government/financial/health: no, account deletion URL (needs a web page).
4. Internal testing (up to 100 testers, instant) → **Closed testing** with the waitlist families
   (≥ 12 testers for 14 days for new personal accounts) → apply for production access →
   **Production** with a staged rollout (e.g. 20 % → 100 %).
5. Store listing: texts §4/§5, 512² icon, feature graphic, phone screenshots, category, contact
   email, website.

**Every later release**

- JS-only fix: `eas update --channel production` (fingerprint keeps it to compatible builds).
- Native change or new SDK: bump `expo.version` (e.g. 1.0.1 / 1.1.0), `eas build` + `eas submit`
  both platforms, update "What's new", re-check §7 if data collection changed.
