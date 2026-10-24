# Brainy Clan app — Operations Handbook (app releases)

The **canonical operations handbook** (product, system map, roles, hard rules, approvals,
incidents, monitoring, support, content, marketing, launch status) is in the backend repo:
**`../Brainy-Clan-Backend/docs/OPERATIONS_HANDBOOK.md`**. Read it first; its hard rules and
approval policy apply here too. This file only adds the app-release runbook details.

Store kit (identity, listings en/fr, audience, Apple age rating, privacy answers, screenshots,
review notes, §10 launch steps): [`docs/STORE.md`](STORE.md). Service setup guides (Google/
Facebook/Apple sign-in, RevenueCat, AdMob + UMP, Sentry): [`README.md`](../README.md).

Markers: **(planned)**, **(not built yet)**, **[Moe]** = needs Moe's explicit approval.
**Status 2026-10-24:** no EAS project (`eas init` not run, so OTA updates are off), no Apple/Google
store apps, `eas.json` submit IDs are placeholders, nothing has been built for a phone with real
service keys. Commands below are run from the repo root (`Brainy-Clan-Frontend`).

## 1. Approvals for the App release agent

- **Alone:** `development` / `preview` builds, OTA to the `preview` channel, TestFlight internal and
  Play internal-testing distribution, rolling back a bad production OTA (§6), store reviewer
  replies that only restate facts (§8).
- **[Moe]:** production store submission and release, production OTA updates, raising
  `min_app_version`, store listing / privacy answers / age rating changes, new SDKs, permissions or
  native config, EAS paid plan, credential changes.
- Never commit to the repo; code or config changes go to Moe as an issue.

## 2. App identity (from `app.json` / STORE.md §1)

Name **Brainy Clan**, slug `brainy-clan`, scheme `brainyclan` (+ `fb<APP_ID>` when Facebook is
configured), iOS bundle ID and Android package **`app.brainyclan`**, marketing version
`expo.version` (`1.0.0`, bumped by hand per store release), build numbers managed remotely by EAS
(`appVersionSource: remote`, `autoIncrement` on `production`), `runtimeVersion` policy
**`fingerprint`**, iPhone/Android portrait, iPad all orientations, no encryption export paperwork
(`ITSAppUsesNonExemptEncryption: false`), no ATT prompt (no tracking).

## 3. EAS profiles and channels (`eas.json`)

| Profile                 | Use                                           | Distribution | Channel       | EAS environment | `env` in `eas.json`                                                                                                                                                                                                                                                    |
| ----------------------- | --------------------------------------------- | ------------ | ------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `development`           | dev client for native work                    | internal     | `development` | `development`   | none                                                                                                                                                                                                                                                                   |
| `development-simulator` | same, iOS simulator                           | internal     | `development` | `development`   | none                                                                                                                                                                                                                                                                   |
| `preview`               | testers, release-like (Android APK)           | internal     | `preview`     | `preview`       | none                                                                                                                                                                                                                                                                   |
| `production`            | TestFlight / App Store, Play tracks (AAB/IPA) | store        | `production`  | `production`    | `EXPO_PUBLIC_API_URL=https://api.brainyclan.com`, `EXPO_PUBLIC_WEBSITE_URL=https://brainyclan.com`, `EXPO_PUBLIC_SUPPORT_EMAIL=support@brainyclan.com`, `EXPO_PUBLIC_TERMS_URL=https://brainyclan.com/terms`, `EXPO_PUBLIC_PRIVACY_URL=https://brainyclan.com/privacy` |

`development` and `preview` get their API URL **only** from EAS environment variables; without
`EXPO_PUBLIC_API_URL` there the app falls back to `http://localhost:8080` (`src/config/env.ts`).
A staging backend does not exist yet **(not built yet)**.

Submit profile `production`: iOS `ascAppId` / `appleTeamId` = `REPLACE_WITH_…` placeholders [Moe
fills them once App Store Connect exists]; Android `track: internal`, `releaseStatus: draft`.

## 4. Environment variables per profile

Set on expo.dev (project → Environment variables) or with
`npx eas-cli@latest env:create --environment <env> --visibility plaintext --name <NAME> --value "<value>"`.
`.env` is local only (git-ignored, never uploaded to EAS). Values never go into docs or tickets.

| Variable                                                                                                   | Kind                               | development                                    | preview  | production    | Notes                                                                |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------- | -------- | ------------- | -------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`                                                                                      | public                             | yes (LAN/tunnel or server)                     | yes      | in `eas.json` | backend origin without `/api/v1`                                     |
| `EXPO_PUBLIC_WEBSITE_URL`, `EXPO_PUBLIC_SUPPORT_EMAIL`, `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL` | public                             | optional (defaults to the brainyclan.com URLs) | optional | in `eas.json` |                                                                      |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`                                     | public                             | yes                                            | yes      | yes           | iOS client ID changes native config → new build                      |
| `EXPO_PUBLIC_FACEBOOK_APP_ID`                                                                              | public                             | yes                                            | yes      | yes           | adds the `fb<APP_ID>` scheme → new build                             |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`                                     | public SDK keys                    | yes                                            | yes      | yes           | never a RevenueCat secret key                                        |
| `ADMOB_IOS_APP_ID`, `ADMOB_ANDROID_APP_ID`                                                                 | build-time                         | yes                                            | yes      | yes           | without them Google's sample IDs (test ads only); change → new build |
| `EXPO_PUBLIC_ADMOB_REWARDED_IOS`, `EXPO_PUBLIC_ADMOB_REWARDED_ANDROID`                                     | public                             | optional (sample units in dev)                 | yes      | yes           | release builds without a unit hide the ad option                     |
| `EXPO_PUBLIC_ADMOB_CONSENT_DEBUG_GEOGRAPHY`, `EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS`                           | debug                              | only                                           | never    | **never**     | development builds only                                              |
| `EXPO_PUBLIC_SENTRY_DSN`                                                                                   | public                             | optional                                       | yes      | yes           | Sentry off when empty                                                |
| `SENTRY_ORG`, `SENTRY_PROJECT`                                                                             | build-time                         | **unset** (no upload)                          | yes      | yes           | enable the source-map upload plugin                                  |
| `SENTRY_AUTH_TOKEN`                                                                                        | **secret** (`--visibility secret`) | —                                              | yes      | yes           | never in `.env`, `eas.json` or the repo                              |
| `EXPO_PUBLIC_SOCIAL_FAKE`                                                                                  | dev only                           | optional                                       | never    | **never**     | fake social tokens (compiled out of production)                      |

Use the same EAS environment for a build and its OTA updates.

## 5. Credentials

Managed by EAS (`npx eas-cli@latest credentials`): iOS distribution certificate and provisioning
profiles (EAS creates them; the Sign in with Apple capability is synced from
`ios.usesAppleSignIn`), **APNs key** (iOS push), Android **upload keystore** (EAS generates it —
back it up via `eas credentials`; enrol in Play App Signing), **FCM V1** service account (Android
push), **Google Play service-account JSON** (for `eas submit`). Android SHA-1 fingerprints of every
signing key (EAS dev keystore, Play app signing key) must be registered as Google Android OAuth
clients and Facebook key hashes (README "Google and Facebook sign-in setup"). Credential changes [Moe].

## 6. Builds, submit and OTA

**Build**

```powershell
npx eas-cli@latest build --profile development --platform android      # or ios (register devices first: npx eas-cli@latest device:create)
npx eas-cli@latest build --profile preview --platform android            # APK for testers
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest build --platform android --profile production         # AAB
```

First time only, if EAS asks: `npx eas-cli@latest build:version:set` (seed the remote build counters).

**Submit [Moe]**

```powershell
npx eas-cli@latest submit --platform ios --profile production --latest      # → TestFlight (15–30 min processing)
npx eas-cli@latest submit --platform android --profile production --latest  # → internal track, draft
```

The very first Android AAB must be uploaded manually in Play Console (Internal testing → Create
release). Then follow STORE.md §10 (TestFlight → App Store with phased release; internal → closed
→ production with staged rollout).

**OTA updates** (only after `eas init`; `app.config.ts` then derives `updates.url`)

```powershell
npx eas-cli@latest update --channel preview --environment preview --message "…"          # alone
npx eas-cli@latest update --channel production --environment production --message "…"    # [Moe]
```

- **Can ship over the air:** JS/TS code, screens, logic fixes, i18n strings, images/sounds bundled
  by Metro.
- **Cannot (needs a store build):** new or upgraded native modules/SDKs, Expo SDK upgrades, any
  change to `app.json` / `app.config.ts` that alters native config (plugins, permissions, schemes,
  AdMob app IDs, Google iOS client ID, Facebook app ID, `version`), new entitlements. The
  fingerprint policy keeps an incompatible update away from old builds, but a wrong-environment
  update can still break API URLs — always pass the matching `--environment`.
- Never use OTA to change the app's purpose, add features that need new store privacy answers or
  review, or touch ad/child rules (those come from the server policy anyway).
- After a production OTA: upload source maps for Sentry with `npx sentry-expo-upload-sourcemaps dist`
  (with `SENTRY_AUTH_TOKEN` only in the shell environment).

**Rolling back a bad OTA** (allowed alone; EAS CLI commands not yet used in this repo — confirm the
flags with `npx eas-cli@latest update --help` before running):

1. Find the previous good update group: `npx eas-cli@latest update:list` (branch `production`).
2. Republish it so it becomes the newest: `npx eas-cli@latest update:republish --group <previous-group-id>`,
   or return devices to the code embedded in the store build:
   `npx eas-cli@latest update:roll-back-to-embedded` (choose the `production` channel/branch).
3. Check the app Sentry project and a test device (kill and reopen the app twice to load the update).
4. Tell Moe what failed; the fix ships as a new reviewed update.

A bad **store build** cannot be rolled back: halt the Play staged rollout / pause the iOS phased
release in the consoles [Moe], fix, and ship a new build.

## 7. Force update (`min_app_version`)

The app sends `X-App-Version` = `expo.version`; the backend answers **426 `app_update_required`**
when it is lower than the global setting `min_app_version` (Admin → Policy → Settings & flags), and
the app shows "Time for an update". `/api/v1/health` is exempt (the app reads the value there too).
Never change `expo.version` through an OTA update: a raised minimum is satisfied by a new store
build. Raise it only after the new version is approved and live in **both** stores [Moe].

## 8. Crash monitoring and store reviews

- **Sentry (app project, e.g. `brainy-clan-app`):** release `brainy-clan@<expo.version>`,
  environment `production` or `development`. Privacy: `sendDefaultPii: false`; bodies, headers,
  cookies, query strings, console text and chat bodies are stripped (`src/features/app/sentry.ts`,
  `sentryScrub.ts`); only the family member id as user; no screenshots, no performance tracing.
  Never re-enable any of these. Check new issues daily during the first week after a release,
  then with the daily monitoring routine; report crash-free sessions in the weekly report.
- **Store review questions / rejections:** answer only with facts from STORE.md §6–§9 and the
  canonical handbook §1 (children never see ads or purchases; not Kids Category; ads non-
  personalized, rated G, no tracking so no ATT; Sign in with Apple offered; account deletion in
  Profile → Privacy → Delete account; data export in Profile → Privacy → Download my data;
  subscription terms on the paywall and in the description). Provide the review family's
  credentials only through the console fields, never in public text. Anything requiring a code,
  listing or privacy-answer change → [Moe]. Reply to user reviews politely, without personal data,
  pointing to `https://brainyclan.com/support` or `support@brainyclan.com`.
- **Before the first submission** re-check STORE.md §6/§7 (updated for the family chat on
  2026-10-24: users interact, messaging limited to the family, "Other in-app messages" / "Other
  User Content") against the live store forms; the lawyer reviews the privacy policy wording.

## 9. Release checklist

1. Scope approved by Moe; the backend it needs is deployed and healthy (`/api/v1/health`).
2. Checks green: `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`,
   `npx expo export --platform web`; occasionally `npx expo-doctor`.
3. Native change → bump `expo.version`, update "What's new" (en + fr).
4. `production` build → TestFlight / internal testing → smoke test with the review family (sign-in
   methods, child sign-in code, every challenge type, goal, chat, paywall in sandbox (three plans,
   no web price or link unless the server enabled that storefront), rewarded ad as
   a free adult, push, deletion flow up to the confirmation, French, iPad portrait + landscape).
5. Data collection or SDKs changed → update STORE.md §7 and the store privacy forms [Moe].
6. Submit and release [Moe]; watch Sentry for 48 h.

## 10. Phone checklists still open

From `docs/PROGRESS.md` "Next up" and "How to test": real iPad (every tab in portrait/landscape,
rotation while playing, Split View / Slide Over, Sudoku 9×9 and word search on an 11" iPad,
modals, hardware keyboard, Stage Manager); iPhone stays portrait; lockout countdown with
VoiceOver/TalkBack; forgot password with a real mailbox; Profile → Help & support once the website
is live; push registration and deep links (needs `eas init`, APNs + FCM); RevenueCat purchase,
cancel, restore, slow webhook (How to test → F6 items 1–5); F8 paywall (three plans, saving %,
trial badge, referral code at sign-up and on the paywall, iOS offer-code sheet / Play redeem link,
a `paddle` plan showing "managed on the web" + Manage, the web link only for an allowed
storefront); AdMob rewarded ad + SSV + UMP consent
(items 6–10); Google/Facebook/Apple sign-in with real IDs (F4b/F4c); chat keyboard avoidance on
Android and long-press delete; F2–F5 on a phone incl. screen readers and maximum font size.
