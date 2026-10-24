# Brainy Clan Frontend — Progress

Update this file at the end of every work session: milestone status, what changed, and what is next.
Milestones are defined in `docs/PLAN.md`.

## Status

| Milestone                         | Status                                                                                                                                                              | Notes                                                                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scaffold                          | Done                                                                                                                                                                | Expo SDK 57, Expo Router, tabs and join placeholders, core packages, CLAUDE.md                                                                                                                 |
| F0 Local environment              | Done                                                                                                                                                                | `npm install` on Node 24, `.env` with LAN IP `192.168.2.23`, expo-doctor 21/21                                                                                                                 |
| F1 App foundation                 | Done                                                                                                                                                                | `/api/v1` client + typed errors, health, version gate, age-adaptive themes, base UI, `/dev/themes`                                                                                             |
| F2 Accounts, family and invites   | Done (sign-in + Family tab checked on web against the mock; real login payload matches)                                                                             | Welcome/register/login/join, create family, Family + Profile tabs, member editor, invites                                                                                                      |
| F3 Play loop                      | Done (played against the live backend on web; backend bugs listed in the log)                                                                                       | Categories + drill-down, play screen, MC + Wisdom Card, feedback, lives, second chances, redemption, offline queue, Home                                                                       |
| F4 Goals and leaderboard          | Done (verified against the real backend 2026-10-11)                                                                                                                 | Goals list, detail (team bar / race, countdown, history), 7-step wizard, Home + Family entry points                                                                                            |
| F2b Member sign-in without email  | Done (verified on web against the real backend B2b)                                                                                                                 | Sign-in code screen, admin code screen, member email login, devices list, set/change password                                                                                                  |
| F5 Remaining challenge types      | Done (played on web against the real B7 backend 2026-10-11; backend bugs in the log)                                                                                | Sudoku (4/6/9), Math Sprint, Word Puzzles (anagram, missing letter, word search); drafts persisted per item                                                                                    |
| F4b Social sign-in                | Built, verified on web against a mock (B6b not served yet; no real client IDs yet)                                                                                  | Google + Facebook buttons, birth step, Profile sign-in methods, dev build setup, README guide                                                                                                  |
| F4c Sign in with Apple            | Built (checks green; only verifiable on an iPhone dev build)                                                                                                        | Apple's native button on welcome/login/register + Profile sign-in methods, nonce, `authorization_code`, birth step, README setup                                                               |
| F6 Monetization and notifications | Built (paywall + rewarded ads code done; web checks green; purchases/ads need a dev build + store/AdMob accounts)                                                   | Family plan card, Notifications, push, account/family deletion (verified on web); RevenueCat paywall and AdMob rewarded ads built 2026-10-16, UMP ad consent 2026-10-17, unverified on a phone |
| F7 Release                        | In progress: release prep done 2026-10-16; 2026-10-22 lockout UX, forgot password, iPad (all orientations, responsive column), production URLs, store audience docs | Store accounts, screenshots (iPhone 6.9" + iPad 13") and submission still to do                                                                                                                |
| F8 Pricing, codes, web checkout   | Built 2026-10-24 (checks green; typed against the B10 contract, backend built in parallel; purchases/codes need a dev build + store accounts)                       | Three-plan paywall (saving %, trials, founding offer), web-managed plans + Manage, referral codes, offer codes, gated web link                                                                 |

## Next up

0.  **2026-10-22 phone/iPad checks** (see log "2026-10-22"): (a) **real iPad** (dev build with
    `supportsTablet: true`, a new native build is needed): every tab in portrait and landscape,
    rotation while playing, Split View / Slide Over at 1/3 and 1/2 width (the app then gets a
    phone-width window), Sudoku 9×9 and word search in landscape on an 11" iPad (board shrinks to
    the height, min cell 36), the paywall and the invite / sign-in-code / goal wizard modals (page
    sheets), the keyboard on login with a hardware keyboard, Stage Manager window resizing.
    (b) **iPhone**: still portrait-only (rotate the phone: nothing turns); Android phone/tablet
    unchanged (portrait). (c) Lockout on a phone: 5 wrong passwords → countdown, VoiceOver /
    TalkBack announce "Too many attempts" once (not every second), app backgrounded during the
    countdown resumes with the right time, social buttons still work while locked. (d) Forgot
    password with a real mailbox (en + fr email, link opens the website page, then sign in with
    the new password; all other devices are signed out). (e) Profile → Help & support opens
    `https://brainyclan.com/support` once the website is live; Email us opens the mail app.

1.  **F7 release (Moe):** approve the owl mascot (`assets/brand/owl.svg`, rendered by
    `npm run brand:render`), then follow `docs/STORE.md` §10: store accounts, `eas init`
    (enables OTA updates), fill `eas.json` submit placeholders, production env vars, review
    family on the production backend, screenshots (§8), lawyer review of the legal drafts.
    Open decisions are listed in the 2026-10-16 "F7 release prep" log entry.

2.  **F7 legal vs the real B9 backend — verified on web 2026-10-16/17** (see log "Regression
    pass vs B9" and "Regression pass finished"). Still to check on a phone / with accounts:
    the social birth-step `accept_terms` 422 against a real provider (blocked by "Waiting for
    Moe" 1; mapping covered by `src/lib/__tests__/formErrors.test.ts`), paywall legal links
    (native only), the export share sheet on a phone, Sentry with a DSN, `policy.ad_request` on a
    dev build. The new native modules (`expo-sharing`, `expo-file-system`,
    `@sentry/react-native`) need a new EAS development build.
    "Continue your game": **verified on web 2026-10-17** against the live endpoint (see log
    entry of 2026-10-17 "verified on web + resume fix").

0a. Done 2026-10-16: account/family deletion verified on web against live B6c (see log).

0. F6 (in progress): (a) Notification settings verified on web 2026-10-15 (Mom: own adult
   defaults 21:30–07:00, toggles, reminder time, quiet hours off/on, reload persists; Family → Sam
   → Notifications child 19:30–07:30, edit + reload; unknown member → "not found"; Sam's own view
   in playful). Still to check: the other themes and French, and optimistic rollback on a failed save.
   (b) Push on a phone (code done 2026-10-15, unverified): needs `eas init` (EAS `projectId`)
   and an EAS dev build; push is silently off on web, in Expo Go, on simulators and without a
   `projectId`. Check: Profile → Notifications → "Turn on notifications" (OS prompt, then
   `PUT /me/push-token`), the prompt after the first completed session, token re-send, sign-out
   sends `DELETE /me/push-token`, taps (`goal_reached`/`period_closed` → goal, `family_activity` →
   Home, `daily_reminder` → Play) from background and cold start, Android channel. iOS also
   needs an APNs key in EAS credentials, Android an FCM V1 key.
   (c) Done 2026-10-15 (admin per-member notification settings).
   (d) RevenueCat paywall + AdMob rewarded ads built 2026-10-16 (see log). To verify on phones:
   Moe follows README "Family plan purchases — RevenueCat setup" and "Rewarded ads — AdMob setup"
   (store products, RevenueCat entitlement `family` + current offering, webhook, keys in EAS env;
   AdMob apps + rewarded unit with SSV to `/api/v1/webhooks/admob-ssv`, test device), makes a dev
   build, then runs the phone checklist in "How to test → F6". Google UMP ad consent **built
   2026-10-17** (see log), unverified on a phone: Moe creates and publishes the GDPR message (and
   optionally the US state message) in AdMob → Privacy & messaging (README "Rewarded ads — AdMob
   setup" step 7), then checks it in a dev build with the EEA debug geography + hashed test device
   ID (How to test → F6, items 8–10). Still needed before an EU/UK release: real
   `EXPO_PUBLIC_TERMS_URL` / `EXPO_PUBLIC_PRIVACY_URL`.

1. F4b with real credentials: Moe follows README "Google and Facebook sign-in setup" (Google
   Cloud + Meta apps, `.env` / EAS env vars), first EAS development build (`eas init`, then
   `eas build --profile development`), then test on a phone and on web against B6b once the backend serves
   `/auth/social/*`.
   1b. F4c on an iPhone: Moe follows README "Sign in with Apple — setup" (Apple Developer Program,
   capability on `app.brainyclan`, backend `APPLE_CLIENT_IDS=app.brainyclan`, iOS dev build with
   EAS) and tests: first sign-in (name → `display_name`, birth step), repeat sign-in, cancel (no
   error), Hide My Email, Profile → Connect/Disconnect Apple, light/dark button in all themes.
   Web Apple JS flow (Services ID) is optional/later.
2. Backend B7 bugs from the 2026-10-11 F5 log (500 on session start, duplicate generated
   questions, "Simplify" accepting unsimplified fractions) - re-check once fixed.
3. Run F2-F5 on a phone (Sudoku 9×9 on a 360dp screen, word-search drag inside the scroll view,
   missing-letter keyboard, app backgrounded mid-puzzle, countdown), including **VoiceOver /
   TalkBack** on the word search (letters become buttons: first letter, then last letter) and the
   OS font size at maximum on the puzzles.
4. Devices list (Profile / member editor) is not paginated by the API; Mom's demo account has
   13+ devices from test sessions. If real accounts can collect many, ask for pagination in the
   contract (then a FlashList screen like goal history), or show the newest few + "Show all".

## Known issues and notes

- Type a `t` parameter as `TFunction` (from `i18next`), not `ReturnType<typeof useTranslation>['t']`:
  with the typed keys the latter hits TS2589 ("excessively deep") once the locale grows.
- Leaving a game with ✕ keeps the session (no abandon); the "Continue your game" card brings the
  member back. The server abandons older unfinished sessions on a new start and idle ones after 24 h.
- Unit tests (`npm test`) cover pure logic only; no component or end-to-end tests yet (Expo
  recommends Maestro for E2E). The first run after an install is slow (~50 s, Babel cache);
  later runs ~10 s. Upgrading to SDK 58 needs Jest 30 (`jest`, `@types/jest`, `jest-expo`
  together, see Expo's "Migrate tests to SDK 58").
- Tests cannot change the time zone at runtime (Jest copies `process.env` per file); the device
  zone is fixed to `America/Toronto` in `jest.globalSetup.js`, other zones go through the
  functions' `timeZone` arguments.
- `ApiErrorCode` in `src/api/types.ts` lacks `family_owner_cannot_leave`, `item_already_answered`
  and `ssv_signature_invalid` from API.md (typing only; `errorMessage` maps the first, the
  second shows the server message).

- Purchases and ads are native-only (`src/config/monetization.ts`): on web, in Expo Go and
  without RevenueCat keys the Plan card keeps the disabled "Upgrade — coming soon" button and
  `/family-plan` shows "Purchases are only available in the app"; the "Watch a short video"
  option is hidden on web / Expo Go / release builds without an ad unit. Development builds
  without ad units use Google's sample rewarded units, which never call the SSV webhook, so the
  reward check ends in "We couldn't confirm your reward yet" — use a real unit + test device.
- Ads request config comes from `policy.ad_request` (2026-10-16): non-personalized, under-age tag
  and max rating per band. Without it (older backend) the app keeps non-personalized + rating G
  and leaves `tagForUnderAgeOfConsent` unspecified.
- Child-invite consent: there is no server signal before an invite exists (the app must not
  compute bands), so the invite form always shows the "If this is a child: parent/guardian…"
  checkbox, optional on the client; `parental_consent: true` is sent only when ticked and the
  server's 422 on `parental_consent` is shown under it. A contract hint (e.g. a band preview
  endpoint or `policy.invite_requires_consent_below`) would let the app show it only for children.
- "Download my data" is shown for every non-child (`!policy.is_child`); the contract says
  "adults" but has no explicit flag, so a teen may get the server's 403 (shown as "Your family
  admin manages your data").

- Chrome automation on this PC: the controlled window reports `visibilityState: hidden`, so
  Reanimated entering animations freeze mid-way (scaled cards swallow clicks), drags don't
  register and the first click after a navigation is often lost. Test with reduced motion on
  (Profile) and tap-tap instead of drag; screenshots force frames. Not app bugs.
- Word search with a screen reader: native switches to the accessible mode only while
  VoiceOver/TalkBack is on (`AccessibilityInfo`); web can't detect screen readers, so on web
  every letter is always a keyboard-focusable button (Tab / Enter), which means many tab stops.
  `accessibilityState.selected` isn't exposed on web buttons; the live caption announces the
  chosen first letter instead. Not yet tried with a real screen reader.
- Demo tokens: never press **Sign out** in the app while using `demo-sam-child-token` /
  `demo-alex-teen-token` (it revokes them); clear `brainyclan.session` in localStorage instead.
- Not yet run on a phone. Checked on web (Chrome) only (F4 also, on 2026-10-11, with a goals mock): theme preview, welcome/login/register,
  and the full play loop (login → Home → Play → session → wrong answers → failed → redemption →
  completed + confetti → offline queue) against a throwaway mock of API.md.
- Real backend on 2026-10-11: `/me/stats`, `/family/leaderboard` and `/play/*` are live (play
  bugs in the 2026-10-11 log); `/goals` still 404. Requests now take ~0.5–1 s; the very first
  request after a container start can take ~15 s (client timeout 15 s, health 10 s). A transient
  nginx 502 happened once while the backend was being worked on.
- Web needs CORS on the backend for `http://localhost:8081`.
- Metro on the F: drive sometimes misses file changes (stale module, "is not a function");
  restart with `npx expo start --web --clear`. The typed-routes generator also briefly listed
  new `src/` files as routes (`/../src/...`) until the restart.
- Goals semantics now defined in API.md (2026-10-11): top-level `reached` is cooperation-only
  (the app follows this everywhere, incl. history rows), `ends_at` exclusive, first period clipped
  to `starts_on`, competition `winner_member_ids` = all tied at rank 1 with > 0 points.
- Testing tip: `npx expo start --web` with `CI=1` disables file watching (no reloads).
- Contract gaps from F3 were resolved in API.md (see the contract follow-up log entry); #2
  (appearance needs a family) is accepted as is.
- Daily development runs natively on Windows (`npm start`); Docker on Windows often misses file changes from the F: drive.
- Token storage falls back to `localStorage` on web (not secure); fine until the web version is built.
- Node 24 is installed instead of the planned 22 LTS; Expo SDK 57 works with it (expo-doctor clean).
- `npm audit` reports advisories in transitive dev/build dependencies of the Expo toolchain; not
  addressed (`npm audit fix --force` would break SDK-pinned versions).
- `npm start` now runs `expo start --go` (Expo Go, as before). `expo-dev-client` is installed for
  the EAS development build; use `npm run start:dev-client` for that build. `app.config.ts` adds
  the env-dependent config on top of `app.json` (Facebook `fb<APP_ID>` scheme, Google iOS URL
  scheme via the nitro plugin; a placeholder scheme when no iOS client ID is set).
- `.claude/settings.json` enables Expo's official Claude plugin (from the Expo template).

## How to test

### F1 — theme preview (web or phone, no backend needed)

1. `npm start`, then press `w` (web) or scan the QR code with Expo Go.
2. Signed out you land on the join screen; tap **Theme preview** (dev builds only), or open
   `http://localhost:8081/dev/themes` on web.
3. Flip Playful / Sleek / Modern / Classic, Light / Dark, text size and reduce motion. Tap an
   answer in the Play section to see correct/wrong feedback; tap **Replay** under Celebration.

### F2 — accounts and family (needs the backend running with B2)

1. Signed out: Welcome → **I'm a parent — create account** → fill the form → **Create family**
   (time zone and country are pre-filled from the phone) → you land on the tabs.
2. Or **Sign in** with the seeded demo `mom@brainyclan.test` / `password`.
3. Family tab (admin): members list, pending invites with codes, **Invite a family member** →
   nickname + birth year/month + avatar → big code with Share / Copy. Tap a member to edit
   nickname, avatar, difficulty (Auto or 1–10) and appearance; remove (tap twice).
4. On a second device/browser: **Join with invite code** → type the code. Adults can switch on
   "Set an email login"; for a child invite the server rejects email/password with a 422.
5. Profile tab: edit name/avatar; Appearance → theme picker (Automatic = policy `ui_theme`),
   text size, reduce motion, calm timers (saved to the server instantly); light/dark (device
   only); language EN/FR; sign out.

### F3 — play loop (needs backend B4/B5 for real data)

1. Home: greeting, this week's points / today / total / streak, family ranking, **Play now**.
2. Play tab: category tiles (each its own color in the playful theme); locked ones show
   "Family plan" + an upgrade hint; categories with sub-scopes open a drill-down with
   **Play all of …** plus the sub-topics.
3. Play screen: progress bar toward the target, hearts = blunder cap. Tap an answer → green/red
   highlight, the correct answer and explanation, **Continue**. Unknown challenge types are
   skipped (a small note says how many).
4. Hit the cap → "Out of lives" with only the options the session allows: free second chance
   (N left today), **Watch a short video** (only when `ad_available`; calls the endpoint with a
   placeholder reward until AdMob in F6), **Redemption round** (3 easier questions), **End game**.
5. Reach the target → celebration (confetti in playful, glow in sleek, check in modern, calm
   check in classic) and **Play again**.
6. Offline: turn on airplane mode and answer → "Waiting for a connection"; the answer is kept on
   the device and sent when you're back (or tap **Try again**).

### F2b - member sign-in without email (needs backend B2b)

1. Admin (Mom): Family -> tap a member -> **Sign-in & devices** -> **Sign in on another device** ->
   **Make a sign-in code**: big code in two groups of 4, live "Expires in 14:59" countdown,
   3 kid-friendly steps, **Share code** / **Copy code**, **New code** (the old one stops working).
   When the countdown reaches 0 the code is struck through and **New code** becomes the main button.
2. Other device, signed out: Welcome (or Sign in) -> **I have a sign-in code** -> type the code;
   case, spaces and dashes don't matter (`5pkr-qg2w` works, pasting `K7QM-4XPA` works). A wrong,
   used or expired code shows a friendly error. Success signs in like join.
3. Member editor -> **Email login** (shown when the member's `email_login_allowed` is true or they already
   have one): type an address -> **Save email**; a taken address or a band without
   `email_login_allowed` shows the server's field error. Badge "Password set" / "No password yet".
   **Remove email login** -> tap again to confirm (also deletes the password).
4. Member editor and Profile -> **My devices**: name, "This device", platform, last seen;
   **Sign out** -> **Tap again** signs that device out (the current device signs out locally too).
5. Profile -> **Password** (only when the user has an email): **Set password** (no current
   password asked) or **Change password** (current password required); mismatch hint, server
   errors per field.

### F4b - Google and Facebook sign-in

Real providers need the README setup (client IDs) and, on phones, the EAS development build;
the backend needs B6b. Without them:

1. Mock: `node social-mock.js` (session scratchpad; proxies to :8080, fakes `/auth/social/*` and
   `/me/social-accounts*`; `dev-fake-google-token` = new account, `dev-fake-facebook-token` =
   linked to Mom; switches via `GET /__mock?noPassword=1&takeGoogle=1&rejectTokens=1&reset=1`).
2. `EXPO_PUBLIC_API_URL=http://localhost:8091 EXPO_PUBLIC_SOCIAL_FAKE=1 npx expo start --web --clear`
   (the fake makes both buttons return the fake token; dev only).
3. Welcome / Sign in / Create account: **Continue with Google** -> "Tell us your birth year and
   month" -> a year after 2008 shows the field error -> 1988 + a month -> signed in. **Continue
   with Facebook** -> signed in directly. `rejectTokens=1` -> "We couldn't verify your Google or
   Facebook account".
4. Profile -> **Sign-in methods**: Google **Connect** -> connected; **Disconnect** (tap twice);
   with `noPassword=1` disconnecting the last one -> "This is your only way to sign in...";
   `takeGoogle=1` -> "already connected to another Brainy Clan user". Children/teens don't see
   the section (policy `collect_email`).
5. Without any `EXPO_PUBLIC_GOOGLE_*` / `EXPO_PUBLIC_FACEBOOK_APP_ID` (and no fake) the buttons
   and the "or" separator are not rendered at all.

### F5 - Sudoku, Math Sprint, Word Puzzles (needs B7, or the mock below)

Without B7: `node f5-mock.js` (session scratchpad; proxies to :8080 and adds four "(mock)"
categories whose sessions and answers it serves per API.md), then
`EXPO_PUBLIC_API_URL=http://localhost:8090 npx expo start --web`. Or open `/dev/themes` -> Play
-> the sample chips (local scoring, no backend).

1. Sudoku: tap a cell, then a number (or type digits; arrows move, `n` toggles notes, Enter
   checks). Givens are locked; duplicates in a row/column/box turn red; **Notes** adds pencil
   marks (placing a digit clears it from peers' notes); **Check** only when every cell is filled.
   Big puzzles show "+5"/"+8" on the card. Wrong -> the solution with green cells where yours
   differed (your digit struck through in the corner), **Solution / My grid** toggle.
   Reload the page or background the app mid-puzzle: the grid and notes come back.
2. Math Sprint: keypad (± for every format, plus `.` for decimals and `/` for fractions), countdown bar
   (seconds as text with reduce motion, hidden with calm timers); "Time's up" still lets you
   answer. A correct answer moves on by itself after ~1 s; equivalent fractions count.
3. Word puzzles: anagram (tap tiles into slots, tap a slot to give a letter back, Shuffle,
   Back, or type), missing letter (one box per `_`, device keyboard so accents work), word search
   (drag across a word in any of 8 directions, or tap its first then last letter; found words get
   a colored band and are struck through; submits itself when all are found; **Give up** -> tap
   again; missed words appear as dashed red bands).
4. Offline: answer while offline -> "Waiting for a connection" with that item kept on screen;
   **Try again** when back -> feedback appears.

### F6 - Family plan purchases and rewarded ads (phone, EAS dev build)

On web (no build needed): Family → Plan shows the plan; for a free family the button stays
disabled "Upgrade — coming soon"; `http://localhost:8081/family-plan` shows "Purchases are only
available in the Brainy Clan app for iPhone and Android". The play screen never offers "Watch a
short video" on web.

Phone checklist (after README "Family plan purchases — RevenueCat setup" and "Rewarded ads —
AdMob setup", `npx eas-cli@latest build --profile development`, `npm run start:dev-client`):

1. Free family, adult admin: Family → Plan → **See the Family plan** → what the plan unlocks,
   Yearly (badge "Best value", monthly equivalent) and Monthly with store prices.
2. **Subscribe** with a sandbox / license-test account → store sheet → pay → "Activating the
   Family plan…" → celebration "Welcome to the Family plan!" → Done → Plan card shows Family,
   locked categories open, member/goal limits gone. RevenueCat customer = `family-<id>`.
3. Cancel the store sheet → "Purchase cancelled — nothing was charged." Turn off Wi-Fi before
   subscribing → network message. If the webhook is slow (>30 s) → "Almost there" screen.
4. Second phone, same family admin: **Restore purchases** → activates (or "No active Family plan
   was found…" for a store account without one).
5. Teen / child / non-admin adult: no "See the Family plan" button; `/family-plan` shows the
   locked state. Sign out after the paywall ran → RevenueCat user back to anonymous.
6. Ads, adult on a free family whose policy allows ads: lose all lives → **Watch a short video**
   → "Loading the video…" → ad → close after the reward → "Checking your reward…" → game
   continues (lives reset). Close the ad early → "Watch the video to the end…". Backend SSV not
   reachable → after ~20 s "We couldn't confirm your reward yet"; tapping the button again
   re-checks the same reward without another ad.
7. Child: the option never appears (server `ad_allowed: false`). Family tier: no ads.
8. UMP consent (README AdMob step 7, `.env` `EXPO_PUBLIC_ADMOB_CONSENT_DEBUG_GEOGRAPHY=EEA` +
   `EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS=<hash>`, fresh install): nothing at app start; first
   **Watch a short video** → Google's consent message (English / French) → after a choice the ad
   loads. Second video in the same session: no message. Kill and reopen: no message again.
9. Profile → Privacy → **Privacy choices for ads** visible (EEA) → opens Google's privacy options
   form; check it also shows after an app restart (status read from the device, no new ad
   needed). With `NOT_EEA`: no message, no row. Child / family tier / web: never a row.
10. Consent dismissed or unavailable (e.g. airplane mode on the very first ad) → "No video is
    available right now", other second-chance options still work; next tap asks again.

### F8 - pricing, codes and the web link (phone, EAS dev build + backend B10)

1. Offering with `MONTHLY`, `SIX_MONTH`, `ANNUAL` packages (README RevenueCat step 2): the paywall
   lists Yearly (highlighted, "Best value", "Save N%", "Just $x a month"), 6 months ("Save N%",
   per-month price), Monthly; N matches the store prices (e.g. 49.99 vs 12 × 6.99 → 40%). Yearly
   is preselected. Check in several worlds (playful, modern, a dark world) and on an iPad.
2. Trial badge "7 days free trial" on 6 months / Yearly with a store free trial; a sandbox account
   that already used the trial no longer sees it (iOS eligibility check). A paid intro offer shows
   "Founding families offer: … for 1 year".
3. Sign-up with "Have a code?" → `MAYA` → create the family → `GET /family` (admin) has
   `referral_code: "MAYA"`; the paywall shows "Code MAYA is linked to your family". An unknown
   code at sign-up → the Family tab / paywall says it couldn't be added (dismiss with Done).
   Offline right after creating the family → the code is retried when the Family tab opens.
4. Paywall "Have a code?" → unknown code → "We don't know that code…"; after a paid purchase →
   "already has a code, or has already paid…" (`referral_code_locked`).
5. iOS: "Redeem a store offer code" opens Apple's code sheet; Android: it opens Google Play's
   redeem page. Not shown on web or in Expo Go.
6. Backend family with a `paddle` plan (`store: "paddle"`): paywall shows "Your Family plan is
   managed on the web" and no plans; **Manage subscription** opens the Paddle portal (server
   link). Store plan: "Manage subscription" opens the App Store / Play subscriptions page.
7. Web link: with the server's `link_storefronts` empty (default) there is no web button or web
   price anywhere. Add `USA` on the backend, use a US store account → "Also available on the
   web" opens the server URL; a Canadian store account still sees nothing.

### F7 - legal, consent, privacy (B9) and Sentry

Without B9 (current backend): register / join-with-email / social birth step show a required
"I agree to the Terms of use and the Privacy policy" checkbox (submit stays disabled until
ticked; no links while `GET /legal` is 404); the invite form shows the optional parental-consent
checkbox; Profile → Privacy shows "Download my data" (tap → "isn't available yet") and "Delete
account", no terms rows; no re-acceptance screen.

With B9 (or a mock that adds `me.legal` and `/legal`): links open the backend pages in the in-app
browser (French adds `?lang=fr`); an adult with `needs_acceptance: true` lands on "We've updated
our terms" after sign-in (no tabs reachable), "Accept and continue" posts both current versions
and continues; a child never sees it. Profile → Privacy → Terms / Privacy rows; "Download my
data" downloads `brainy-clan-my-data-<date>.json` on web, opens the share sheet on a phone; a
second try within an hour → "once per hour" message. Child invite without the box → error under
the checkbox. Sentry: with `EXPO_PUBLIC_SENTRY_DSN` set, throw a test error; the event has only
the member id as user, no request body/headers. Check `/dev/themes` for the checkbox in all four
themes (light/dark).

### F7 - invite preview, re-acceptance summary, release assets

- Invite (as Mom, Family → Invite): no consent checkbox until birth year + month are set; ~0.4 s
  later `GET /family/invites/preview` runs once (debounced). Backend without the endpoint (404) →
  the old optional "If this is a child…" checkbox. With B9: child → "Age group: Child" + required
  checkbox, Create disabled until ticked; teen/adult → no checkbox, nothing sent. A 422 on
  `parental_consent` always shows the checkbox. Delete test invites from the Family tab.
- Re-acceptance (adult with `me.legal.needs_acceptance`): each document shows "Updated" + the
  `GET /legal` `summary` + "You accepted version X" when its accepted version differs, else "No
  changes since you last accepted it"; Accept posts the current versions from `me.legal`.
- Export: saves the `data` object of `GET /me/export` as `brainy-clan-my-data-<exported_at date>.json`.
- Brand: `npm run brand:render`, then `npx expo start --web` → `/favicon.ico` is the owl; on a new
  dev/preview build check the home-screen icon (iOS, Android adaptive + themed icon) and the
  splash (blue `#1D6FD8`, dark `#10233F`). `npx expo-doctor` 21/21; `npx expo config --type public`.

## Log

### 2026-10-24 How to play help center

- **Links** to the website help center (backend `/help`, PLAN "How to play"):
  `src/config/links.ts` `WEBSITE_LINKS.help`, `HELP_ANCHORS` (`invite-kids`, `sign-in-code`,
  `family-chat`) and `helpUrl(language, anchor?)` (`?lang=fr` for French, `#anchor` last); tests in
  `src/config/__tests__/links.test.ts`.
- `src/features/help/HelpLink.tsx` (`openHelp`, small ghost "How does … work?" button, in-app
  browser). Profile → About → **How to play** (first row, all members); help links on the invite
  form (#invite-kids), the sign-in code screen (#sign-in-code) and the chat empty state action
  (#family-chat). i18n `help.*` en/fr.
- Verified on web (390 px): rows render, taps open `https://brainyclan.com/help`,
  `…/help#invite-kids`, `…/help#sign-in-code`. Checks: typecheck, lint, format, 708 tests, web export.

### 2026-10-24 chat report + EAS env

- **Chat report** (contract `POST /family/chat/messages/{id}/report`, Message `reported`, push and
  preference `family_chat_report`): a non-admin long-presses another member's message → "Report
  to a parent" → in-app `ConfirmSheet` ("Your parents will be told. They can remove the message.")
  → a notice "Your parents have been told". Own messages keep "Delete"; admins keep "Delete" and
  never see "Report". Errors: 422 own, 403 (forbidden / `chat_disabled`), 404 gone, 429 rate
  limited, network — each with its own text (`reportErrorKey` in `chat/api.ts`).
- **Admins:** a "Reported" tag under reported messages (only when `reported` is true; tombstones
  hide it) opens a review sheet: Delete, or "Turn off chat for <name>" (member `PATCH
chat_enabled`, hidden for former members or when chat is already off). Long-pressing a reported
  message opens the same sheet. The poll now also picks up `reported` changes (`insertMessages`).
- **Push `family_chat_report`:** refreshes the loaded history; a tap opens `/chat?message=<id>`,
  scrolls to and briefly outlines the message when it is loaded, else just opens the chat.
- **Notifications:** `family_chat_report` toggle (default on) shown only when the edited member is
  an admin (own screen: `useIsAdmin`; admin editing a member: `role === 'admin'`). Types moved to
  `notifications/notificationTypes.ts`; `NotificationPreferences.types` is now partial (newer keys
  may be missing on older backends).
- Message text stays plain `<Text>` via `MessageText` (safety test unchanged: it scans the whole
  chat folder, so the new code is covered).
- **EAS:** `eas.json` `development` sets `EXPO_PUBLIC_API_URL=http://192.168.1.50:8080`
  (placeholder: replace with your PC's LAN IP before building) and `preview` the five production
  values (`https://api.brainyclan.com`, website, support, terms, privacy) — no build falls back to
  `localhost`. README "Backend URL in EAS builds", OPERATIONS_HANDBOOK §3/§4; backend handbook
  §14.1 item 2 marked fixed.
- Tests: report gating (own / admin / non-admin / tombstone), `reported` merge, "Reported" tag and
  long-press labels (`report.test.tsx`), report error mapping (422/403/404/429/network),
  admin-only notification toggle + locale keys (`notificationTypes.test.ts`); i18n parity.
- Phone check still open: report flow end to end (child reports → parent gets the push → tap
  opens the chat at the message → Delete / Turn off chat), VoiceOver/TalkBack "Report" action.

### 2026-10-24 F8 paywall, codes, web link

- **Paywall (F8):** three plans from the RevenueCat current offering, mapped by package type
  (`MONTHLY` / `SIX_MONTH` / `ANNUAL`, custom packages by product ID
  `brainyclan_family_monthly|6months|annual`) in pure `src/features/billing/packages.ts`. Annual
  first and highlighted; per-month price from the store; saving % against the monthly plan computed
  from the offering's store prices (same currency, rounded down; never hard-coded); free-trial
  badge from the product's intro price (price 0) and a "Founding families offer" line for a paid
  intro price; iOS intro eligibility hides trials an account already used. Purchase / restore /
  sync / poll flow unchanged; a 409 `subscription_exists` while polling stops and reloads the plan.
- **Plan source:** `planSource()` (`source.ts`): a running `store: "paddle"` plan → "Your Family
  plan is managed on the web" (no purchase options); running store plans → "already has the
  Family plan". **Manage subscription** (paywall + Family tab Plan card) calls
  `POST /family/subscription/manage-link` (Paddle portal in the in-app browser, store pages via
  `Linking`; falls back to the store subscription pages while the endpoint 404s).
- **Referral codes:** "Have a code?" at parent sign-up (persisted device-locally in
  `useReferralStore`, cleared on sign-out / "already have an account") → sent with
  `POST /family/referral-code` right after `POST /families`; network failures retry from the
  Family tab; `referral_code_invalid` / `referral_code_locked` → friendly en/fr notice. Paywall
  "Have a code?" for admins; shows the applied code (`GET /family` admin `referral_code`).
- **Store offer codes** (native, admins, paywall): iOS `Purchases.presentCodeRedemptionSheet()`
  (react-native-purchases 10.14), Android opens `https://play.google.com/redeem`.
- **Web checkout link:** `Purchases.getStorefront()` (alpha-3 on iOS, alpha-2 on Play → mapped by
  `src/lib/countryCodes.ts`) → `GET /family/web-checkout/availability?storefront=`; "Also
  available on the web" only when `link_allowed` with an https URL; unknown storefront / web / Expo
  Go → no call, no link, no web prices anywhere.
- Types: `SubscriptionStore` + `paddle`, `Family.referral_code`, `ManageLink`,
  `WebCheckoutAvailability`, `ReferralCode*`, new error codes (`subscription_exists`,
  `web_checkout_unavailable`, `referral_code_invalid`, `referral_code_locked`) in `errorMessage`.
- Tests: `billing/__tests__/packages.test.ts` (mapping, saving %, trials/intro, eligibility,
  order), `source.test.ts` (plan source, link gating, storefront codes), `referral.test.ts` (code
  normalizing, error mapping, pending-code flow), `webCheckout.test.ts` (availability gating);
  errorMessage test extended. README RevenueCat setup (three products, package types, intro
  offers, offer/promo codes, step 9) and OPERATIONS_HANDBOOK checklists updated.
- Checks: typecheck, lint, format:check, `npm test`, `npx expo export --platform web` green.
- Not verifiable without a dev build + store accounts: store prices / trials / eligibility, the
  iOS code sheet, Play redeem, `getStorefront()` values, manage links (How to test → F8).

### 2026-10-24 operations handbook

- New `docs/OPERATIONS_HANDBOOK.md`: app-release runbook for the external ops team (EAS profiles,
  env vars per profile, credentials, build/submit, OTA rules and rollback, `min_app_version`,
  Sentry, store review replies, release + phone checklists); points to the canonical handbook in
  the backend repo. README links it. Docs only. Found: STORE.md §6/§7 still say "no chat" /
  "messages not collected" (family chat exists since 2026-10-23) — must be updated before submission.

### 2026-10-24 family chat web QA

- Verified on web (Sam via demo token + Mom side by side at 390×844): emoji both ways (polling
  < 5 s), Chat tab badge, "Today" separator, `<script>`/`<img onerror>`/Markdown/URL shown as
  literal text (no alert, no `<img>`, no link), own delete + admin delete → tombstones on both
  sides, chat off for Sam → "A parent turned chat off for you" and back on, retention text "7 days"
  - upsell on the free plan / "1 year" on the Family plan, offline send → "Waiting for a
    connection…" then sent once (one POST, same `client_id`).
- **Fixed:** an empty chat never showed the first incoming message until the history went stale
  (~1 min; `after` polling had no cursor), and messages deleted by others never turned into
  tombstones while the screen stayed open. The poll now re-reads the newest page when the cache is
  empty and every 20 s (`applyLatestPage` in `messages.ts`, tests). `ConfirmSheet`: the backdrop
  button no longer wraps the dialog's buttons (nested `<button>` error on web, screen readers saw
  one "Cancel" button around the whole dialog).
- Note: deleting on web is long-press only (mouse hold works); a member editor switch flip only
  reaches a child's open "chat off" screen when `me` refetches (focus/next start).
- Screenshots: `docs/screenshots/chat/family-chat-kid.png`, `family-chat-parent.png`.

### 2026-10-23 family chat (app)

- New **Chat tab** (5th tab, between Play and Family) with an unread badge: chat is a frequent,
  time-sensitive feature and the badge must be visible from everywhere. 5 tabs is Apple's iPhone
  maximum and fits: labels are short (en "Chat", fr "Messages"; the screen title is "Family chat"
  / "Discussion familiale"), ~75 pt per tab on a 375 pt phone; iPad shows icon + label side by side.
- `src/features/chat/`: `messages.ts` (pure: merge/dedupe by id + `client_id`, tombstone wins,
  cursors, rows with day separators, author grouping, retention text, delete rule, access),
  `api.ts`, `hooks.ts` (infinite history with `before`, `after` polling every 4 s only while the
  screen is focused and the app active, unread every 60 s for the badge, mark read for visible
  messages, optimistic delete), `outbox.ts` (persisted per-member outbox like the answer queue:
  optimistic send with an expo-crypto UUID `client_id`, waiting/failed states, retry with the same
  `client_id`, re-send on reconnect/foreground, cleared on sign-out), `ChatScreen.tsx` +
  components (bubbles in world tokens — own = primary/onPrimary, others = surface/text, rounder in
  kid worlds; Clan avatar + nickname, "Former member", "Message deleted", local-time stamps;
  composer with 1000-char limit + counter from 900, 12 quick emoji, Enter sends on web; in-app
  confirm sheet for delete / discard; retention notice + Family plan link for admins on free;
  "A parent turned chat off for you" for `chat_enabled: false` / 403 `chat_disabled`).
- **Safety:** bodies render only in `MessageText` (one plain string child of `<Text>`,
  `dataDetectorType="none"`, web word-break); tests check `<script>`, `<img onerror>`,
  `javascript:` render literally and grep the feature for WebView/innerHTML/Markdown/Linking/
  console. Sentry scrubbers moved to `src/features/app/sentryScrub.ts` (+ tests): no bodies, chat
  breadcrumbs keep no details, `extra.body` dropped.
- Push `family_chat`: tap opens the Chat tab, arrival refreshes badge/poll; toggle in
  notification settings. Member editor: "Family chat" switch (`chat_enabled`, saved at once).
- Types (additive): `ChatMessage`, pages/meta, `Member.chat_enabled`, `Policy.chat`,
  `family_chat`, `chat_disabled`. No new color tokens (bubble pairs are already in the contrast test).
- Not verified in a browser: the backend chat endpoints weren't deployed yet (404). Check on a
  device: keyboard avoidance on Android edge-to-edge (`KeyboardAvoidingView` padding), long-press
  delete, push routing.
- Checks: typecheck, lint, format:check, npm test (40 suites / 629 tests), web export.

### 2026-10-23 nonogram + spot the difference

- Renderers registered in `src/challenges/registry.ts` (`nonogram`, `spot_difference`, both
  `wide`) with payload guards; types in `src/api/types.ts`; strings `challenge.nonogram.*` and
  `challenge.spot.*` (en + fr).
- `src/challenges/nonogram/`: `logic.ts` (guard, `lineRuns` / `isLineSatisfied` /
  `satisfiedLines` — a pure clue check, no solution), `Nonogram.tsx`: row clues left, column clues
  on top, min cell 28 pt (the board scrolls sideways when it doesn't fit), thick lines every 5;
  tap fills, long-press or the Mark mode sets ✕ (local only, sent as 0), drag paints along a row
  or column, Clear; a clue fades when its line matches; Check sends `{ grid }`; after scoring the
  solution picture, the server `title` ("A sailing boat!") and the world `Celebration`; wrong
  cells tinted red. Screen readers: every cell a button ("Row 2, column 3: filled"), clues as text.
- `src/challenges/spot/`: `logic.ts` (guard, `applyChanges`, `hitTest` / `scoreTaps` mirroring
  the contract: radius `size × 0.75`, min 0.06, each change once; `normalizeTap`,
  `locateInPair`, `objectCenterTap`), `props/index.ts` (12 original flat props, asymmetric so
  `flip` shows; named colors → fixed art palette in this module only), `SpotDifference.tsx`
  (stacked below 520 pt, side by side above; world `backgroundAlt` / `surfaceAlt` background;
  instant ring on both pictures + `correct` sound, ✕ + `wrong` sound on a miss, found/misses
  badges; sends `{ taps }` when all are found or misses exceed `max_misses`; screen readers or
  "Use a list" get an object list with "Is this different?" buttons that tap the object centre).
- **Contract assumption to confirm on the backend:** tap y is normalized by the picture height,
  objects' y by the width, so the hit test uses `tap_y / aspect`; a `size` change uses the
  object's original size for its circle.
- Dev page `/dev/games`: samples in `src/features/dev/puzzleSamples.ts` (nonogram 5×5 and 10×10,
  spot 5 changes) appended to `BRAIN_GAME_SAMPLES`. Verified on web at phone width in Jungle and
  Neon: `docs/screenshots/games/nonogram-jungle-solved.png`, `spot-difference-neon-phone.png`.
  Drag-painting could not be exercised in the browser harness (synthetic drags arrive as taps);
  check it on a phone.
- Tests: `src/challenges/nonogram/__tests__/logic.test.ts`, `src/challenges/spot/__tests__/logic.test.ts`
  (guards, clues, hit-testing, tap math, prop art), registry valid/invalid cases.

### 2026-10-23 memory match + pattern sequence

- Brain-game renderers registered in `src/challenges/registry.ts` (`memory_match`,
  `pattern_sequence`) with payload guards (malformed items are skipped). Types in `src/api/types.ts`.
- `src/challenges/memory/`: `logic.ts` (guard + `replayAttempts`, a pure mirror of the server
  rules: two different unmatched in-range positions per attempt, correct = all pairs within
  `max_attempts`), `MemoryMatch.tsx` (world card back with the owl mark `OwlMark.tsx`, scale-X
  flip, instant with reduced motion; matched pairs bounce; mismatches flip back after 800 ms /
  1200 ms with calm timers; attempts kept as a draft; the full attempts list is sent automatically
  when all pairs are found or attempts run out; "Check" stays as a retry if sending failed).
- `src/challenges/pattern/`: `logic.ts` (guard, `tapPad`/`inputStatus`, `playbackTiming` = `show_ms`
  ×1.5 with calm timers, `padToneRate`), `PatternSequence.tsx` (Start → Watch plays the pattern
  once with highlight + scale + a tone per pad, then Your turn; a wrong tap is sent at once; no
  replay, also after leaving: `watched` is a draft; with a screen reader the pattern is announced).
- Sounds: `playSound(pack, name, rate?)` / `useSoundEffects().play(name, rate?)` play a sound at a
  playback rate (no pitch correction, best effort); renderers use `useUiSound()` (fed by
  `useSoundEffects` in `AppThemeProvider`) so the registry stays free of `features/` imports.
- Dev page `/dev/games?world=jungle&game=0` (`src/features/dev/GamesPreview.tsx`,
  `brainGameSamples.ts`): every world, light/dark, reduced motion, calm timers, local scoring.
  Screenshots: `docs/screenshots/games/memory-match-jungle-phone.png`,
  `pattern-sequence-neon-phone.png`.
- Tests: `src/challenges/memory/__tests__/logic.test.ts`, `src/challenges/pattern/__tests__/logic.test.ts`,
  playback-rate test in `src/features/sound/__tests__/sound.test.ts`, registry key list.

### 2026-10-23 new categories art + icons

- Contract icon keys `bulb, language, rocket, earth, palette, restaurant, football, shield, sparkles`
  added to `CategoryIcon` (`src/api/types.ts`) and `categoryVisuals.ts` (Ionicons + emoji; `earth`
  = partly-sunny because `globe` already uses the earth glyph). Lookup is now own-key only
  (`constructor`/`toString` used to hit the prototype); unknown keys fall back to `shapes-outline`
  (was `sparkles-outline`, now taken by `sparkles`). Tests in `categoryVisuals.test.ts`.
- 9 new category scenes (`scripts/illustrations/scenesMore.mjs`, new `word()` + glyphs H J L N P T U
  in `props.mjs`): logic-riddles (raccoon detective, lens, ? bulb), language-swap (cat + frog,
  HELLO/BONJOUR bubbles), inventions-technology (otter, goggles, gears, robot), our-planet (turtle
  hugging a smiling Earth), art-music (giraffe, beret, palette, notes), food-world (bear chef, fruit
  basket), sports-games (dog, football, chess king), brain-games (fox + frog, memory cards),
  life-skills (penguin, helmet, STOP sign, zebra crossing). `npm run art:build`: 17 scenes; art test
  covers all 17 slugs.

### 2026-10-23 worlds phase 2: six new worlds

Moe: "Go for phase 2" (docs/PLAN.md). Contract keys `sea`, `dino`, `sticker`, `lofi`, `nature`,
`midnight` added to `THEME_KEYS` and `WORLD_ORDER` (kids, teens, then calm worlds).

- **Worlds** (`src/ui/themes/`, light + dark each, all 13 worlds pass the AA contrast test):
  Under the Sea (kids: sea-glass cards with bubbles, submarine progress, bubble celebration),
  Dino Valley (kids: stone cards with a fern, dino footprints walking to an egg, leafy confetti),
  Sticker Street (teens: Lilita One display type, taped die-cut cards with ink offset + doodle star,
  ink buttons, highlighter progress, stickers slap down when you win), Lo-fi Dusk (teens: pastel
  sunset, frosted cards, gradient buttons, cassette progress with turning reels, music notes
  drifting up), Calm Nature (everyone: soft greens, Atkinson body + Nunito headings, between modern
  and classic in size, checked at 160 % text), Midnight (everyone, dark-first: Playfair Display
  headings, gold double-rule framed cards, star burst). Fonts added: Lilita One, Playfair Display.
- **Token schema** (additive): scenes `sea|dino|sticker|lofi|nature|midnight`; cards `aqua`,
  `stone`, `taped`, `framed`; button `ink`; progress `submarine`, `footprints`, `cassette`,
  `marker`; celebrations `stickers`, `notes`. Lo-fi reuses `glass`, Nature `flat`/`bar`/`calm`.
- **Scenes** (memoized, ≤ 2 loops on transform/opacity, static with reduced motion and on play
  questions, no real blur): sea (sun rays, coral, seaweed + fish sway, Clan octopus peeking,
  bubbles rising as a seamless cycle), dino (sleepy smiling volcano puffing smoke, hills, ferns, a
  long-neck dino peeking), sticker (paper posters, edge sticker-bomb, tape, doodles that blink),
  lofi (sunset gradient, two skylines with lit windows and a rooftop cat, slow clouds, gentle rain as
  a seamless cycle), nature (gradient sky, low sun / crescent moon, three hill layers with trees,
  clouds + a few birds), midnight (star field, slow gold twinkles, constellation, crescent moon
  rising over a hill line with a breathing halo).
- **Sounds**: packs `sea` (watery bloops), `dino` (low wooden stomps), `sticker` (snappy plucks),
  `lofi` (warm detuned e-piano), `nature` (breathy flute), `midnight` (soft celesta) in
  `scripts/sounds` → 72 files, ~1.1 MB, each < 30 KB; the six phase-1 packs are byte-identical.
- i18n en/fr: world names, picker descriptions, dev pack names. Tests: `worlds.test.ts` (every
  world has a pack, picker slot, names and descriptions); `selectThemeKey.test.ts` updated for 13.
- Verified on web (Sam, 390 px and 820 px iframe; world injected client-side, nothing changed on
  the server): screenshots `docs/screenshots/worlds/{sea,sticker,lofi,midnight}-phone-correct.png`,
  `dino-phone-question.png`, `nature-phone-question.png`, `nature-phone-large-text.png`,
  `sea-ipad-play-categories.png`. Note: Metro's watcher missed edits on this drive; restart
  `expo start` if a change doesn't show.
- Needs a phone: scene frame rate on a mid Android (sea/lofi cycles, sticker scene has ~15 small
  SVGs), the `taped` / `ink` hard edges and the `aqua` glow on Android, new sound packs' loudness.

### 2026-10-23 world unlock UX

Phase 2 of "Theme worlds" (docs/PLAN.md): unlocks come from the server (API.md "Worlds and
unlocks", `GET /me/worlds`, admin `GET /family/members/{member}/worlds`, member `theme_unlocked`,
403 `world_locked`). The app never hard-codes thresholds or which worlds are locked.

- `src/features/worlds/`: `catalog.ts` (parse: unknown keys / malformed entries skipped; picker =
  server order ∩ app themes, fallback = every world unlocked when the endpoint 404s; hints
  "23 / 50 points", "2 / 3-day streak", "Family plan"; tap action select / paywall / ask a parent /
  how to unlock), `hooks.ts` (`useMyWorlds`, `useMemberWorlds`, `invalidateWorlds`,
  `recoverFromWorldLocked`), `unlockSeen.ts` (locked → unlocked diff + per-member AsyncStorage
  state, celebrated once), `WorldUnlockSheet.tsx` ("New world unlocked!" with the world's mini
  preview + its confetti, `unlock` sound, Try it / Later; mounted in the tabs layout, only while
  the tabs are focused, so never mid-question), `WorldThumbnail.tsx` (moved out of the editor).
- Picker (Profile + admin member editor, which uses the member's catalog): locked worlds dimmed
  with a lock badge, hint and a small progress bar; Family-plan worlds open the paywall for adult
  admins allowed to purchase, else "Ask a parent…"; points/streak worlds explain how to unlock.
  The admin save no longer re-sends an unchanged (maybe re-locked) theme.
- `selectThemeKey`: `theme_unlocked: false` → the member's `default_ui_theme`.
- Worlds are invalidated after answers with points, finished sessions, the plan switch
  (`waitForFamilyTier`) and the Family tab refresh; a 403 `world_locked` shows a friendly error
  and refetches catalog + member.
- Tests: `worlds/__tests__/catalog.test.ts`, `unlockSeen.test.ts`,
  `ui/themes/__tests__/selectThemeKeyUnlocked.test.ts`. Not yet checked on web against the real
  endpoint (backend in progress).

### 2026-10-23 Theme worlds phase 1

Moe: "the themes are too simple and might not be attractive for kids and teens" → decision "Theme
worlds" (docs/PLAN.md). Contract: theme keys `jungle`, `space`, `neon` + `sound_effects`
(API.md changelog 2026-10-23).

- **Token schema** (`src/ui/themes/types.ts`): `displayName` (i18n key), `audience` (picker hint
  only), `vibe` (kid / teen / calm — replaces `theme.key === 'playful' | 'sleek'` checks),
  `scene`, `card` (flat | glass | sticker | chunky | porthole | neon), `button` (flat | press3d |
  glow), `progress` (bar | vine | rocket | neon), `celebration` (confetti | stars | bubbles |
  sprinkles | calm), `soundPack`; colors gain `scene` (large layers), `sceneAccent`, `glow`.
  `WORLD_ORDER` for pickers; `selectAccessibility` also resolves `sound_effects`.
- **Worlds**: new `jungle` (Jungle Adventure), `space` (Space Explorers, dark-first), `neon` (Neon
  Arcade, dark-first, Pixelify Sans headings only); `playful` → Candy Land (sticker cards,
  sprinkles), `sleek` → Glass (frosted cards over a drifting violet→cyan mesh, bubbles). `modern`
  / `classic` unchanged in look (calm check celebration). Fonts added: Fredoka, Pixelify Sans.
  Every world light + dark. **Contrast test** `src/ui/themes/__tests__/contrast.test.ts` (helpers
  `contrast.ts`): text/muted/subtle, primary/danger/success/warning text, on-colors, hero gradient
  stops and every large scene layer pass WCAG AA in all 14 combinations. To pass, a few existing
  tokens were darkened/lightened (candy primary/secondary/success, glass dark primary now light
  violet with dark text, modern subtle/success/warning, modern dark primary light blue with dark
  text).
- **Scenes** `src/ui/scenes/` behind every `Screen` (measured once, memoized, ≤ 2 Reanimated loops
  animating only transform/opacity of static SVG layers; none with reduced motion; play questions
  use the static scene): candy (pastel blobs, lollipop, sprinkles, gumdrops), jungle (canopies,
  swaying vines, monkey + tiger peeking from bushes, fireflies at night), space (nebula, star
  field, twinkling sparkles, drifting planets), neon (synthwave sun, rolling perspective grid,
  scanlines), glass (radial-gradient mesh). Dark decorations stay inside the screen padding.
- **Components**: Card styles (sticker, plank with leaf, porthole with rim + rivets, glass with
  web-only backdrop blur, neon glow); Button press3d / glow (glow ring on press) / flat; ProgressBar
  vine (grows leaves + flower), rocket (flies to a planet), neon (segmented glow); Celebration with
  the member's character cheering + per-world overlay (`Confetti`: confetti / sprinkles / star
  burst / bubbles); `ClanReaction` (cheer = jump + sparkles, encourage = nod + heart) in the
  feedback panel after every answer; `Badge sticker` (die-cut sticker in kid worlds).
- **Category tiles** use `CategoryArt` (sub-categories show their top-level family's art via
  `findRootSlug`, tested). `CategoryArt`'s a11y props moved to a wrapping View (web DOM warning).
- **Sounds** (`useSoundEffects`): correct / wrong in PlayScreen (replaces its direct
  `Haptics.notificationAsync`), `celebrate` on completion, `levelUp` on a reached goal, `tap` on
  md/lg primary buttons in kid worlds only (via `UiSoundProvider` in `AppThemeProvider`, so `src/ui`
  doesn't import features).
- **Appearance**: world picker with live mini previews (scene + card + progress + button, name,
  "For kids / teens / everyone" label), Automatic = policy default; sound effects Automatic / On /
  Off (`accessibility.sound_effects`). **/dev/themes**: "All worlds" gallery (every world × light/
  dark side by side) + the single-world view (now with Clan reactions and sticker badges).
- Verified on web (Sam, phone 390 px and iPad 820 px via iframe): Home, Play categories,
  sub-categories, play session correct + wrong (Jungle, Space, Neon, Glass), live world switch in
  Profile → Appearance. Screenshots: `docs/screenshots/worlds/`.
- Needs a phone: 60 fps of scenes on a mid Android (Glass uses no real blur on native), sticker /
  neon shadows on Android (colored elevation shadows need API 28+), sounds + haptics.

### 2026-10-23 category art + sound effects

Moe's decision "Theme worlds" (docs/PLAN.md): illustrated category cards and world sound packs.
Contract: member `accessibility.sound_effects` (null | bool), policy
`accessibility_defaults.sound_effects` (API.md changelog 2026-10-23).

- **Category art** `scripts/illustrations/` (`npm run art:build`): one scene per seeded top-level
  slug, built from the Clan generator's characters plus flat props — geography: fox explorer with
  a globe and a treasure map; science: owl at a bench with a microscope and a sprout; wisdom:
  tortoise grandpa with a glowing book; math sprint: rabbit dashing with number tiles and a
  stopwatch; sudoku: panda dropping a tile on a grid; word puzzles: monkey juggling A-B-C over
  W-O-R-D blocks; history: elephant with a scroll, castle and pyramid; vocabulary: cat mom with a
  bee and B-E-E tiles; fallback: Ollie peeking over a "?" box. Digits/letters are stroke paths (no
  fonts). Output `src/ui/illustrations/categoryArt.generated.ts` (~60 KB, prettier-ignored,
  transparent, no ids); contact sheets `assets/illustrations/_sheets/*.png` (git-ignored; 200 px
  detail, card colours at 160/96/64 px). `CategoryArt({ slug, size, parentSlug? })`: own scene →
  parent's scene → fallback.
- **Sound effects** `scripts/sounds/` (`npm run sounds:build`): original, synthesized from plain
  oscillators (no samples, no licences): 6 packs (candy bubbly plucks, jungle marimba + wood
  knock, space soft pings + echo, neon 8-bit pulse, glass bells, calm soft sines) × 6 sounds
  (tap 40 ms, correct 300 ms arpeggio, wrong 300 ms soft falling "boop", celebrate 1.2 s fanfare,
  levelUp 0.8 s run, unlock 0.7 s sparkle). 44.1 kHz mono; tap/correct/wrong 16-bit WAV (instant
  start), the longer three MP3 (`@breezystack/lamejs` devDependency; no ffmpeg needed). 36 files,
  ~0.5 MB total, each < 30 KB (build fails otherwise). Generated `soundAssets.generated.ts`.
- **App** `src/features/sound/`: `useSoundEffects()` → `{ enabled, play(name) }`; enabled = member
  `sound_effects` ?? policy default ?? false; pack = `theme.soundPack` (unknown → candy).
  `expo-audio` (added with `npx expo install`, no config plugin: no microphone permission):
  players created per pack and reused, previous pack released, volume 0.6, fire-and-forget,
  failures ignored. Audio mode `playsInSilentMode: false` + `mixWithOthers` (expo-audio defaults
  to true, which would ignore the iOS silent switch). Haptics follow the toggle (light on correct,
  soft on wrong, success on celebrate/levelUp/unlock; none on tap, buttons already do it).
  `src/api/types.ts`: `sound_effects` on `Accessibility` (optional) and `UpdateAccessibilityBody`.
- **Dev** `/dev/sounds` (Profile → dev rows): audition every pack/sound (ignores the toggle) and all
  category art at 160/96/64.
- Tests: `src/features/sound/__tests__/sound.test.ts` (enabled resolution, no-op when off, pack
  fallback, player reuse/release, never throws), `src/ui/illustrations/__tests__/categoryArt.test.ts`
  (every top-level slug, parent/fallback, no ids).
- Not wired yet: screens still call `Haptics.notificationAsync` directly in PlayScreen; answer /
  celebration screens should call `useSoundEffects().play(...)` instead (the worlds work).
  Phone check: silent switch on iPhone mutes effects; Android follows media volume.

### 2026-10-22 Clan characters

Moe's decision "The Clan characters" (docs/PLAN.md); contract API.md "Avatars" (132 keys).

- **Generator** `scripts/clan/` (`npm run clan:build`, Node only, no new deps): `species.mjs` (22
  species: head shape, ears/mane/horns/trunk/shell/tentacles, markings, colours), `variants.mjs`
  (kid / teen / mom / dad / grandma / grandpa layers: big eyes + cheeks; hoodie + headphones, cap or
  beanie; lashes, lipstick, earrings, bow / bun / flower / headband; moustache or beard styles +
  bow tie / tie / polo; grey curls or bun, round glasses, pearls, cardigan; white beard or
  moustache, bushy brows, glasses, cardigan, flat cap for some). Flat shapes, soft shading, no
  outline (like Ollie). Lionesses have no mane, the lion dad/grandpa a full one. The kid owl is Ollie.
- **Output**: `assets/clan/<key>.svg` (132), `src/ui/avatars/clanSvgs.generated.ts` (key -> SVG,
  ~0.5 MB, prettier-ignored), contact sheets `assets/clan/_sheets/*.png` (git-ignored, ~2.6 MB).
- **App**: `src/ui/avatars/` (keys, `AvatarKey`, species/variant parsing, picker groups ordered by the
  policy age band); `src/api/types.ts` re-exports `AVATAR_KEYS`/`AvatarKey`. `Avatar` renders the
  character with `SvgXml` (memoized; unknown/null -> person placeholder); emoji map removed.
  `AvatarPicker`: Kids / Teens / Parents / Grandparents tabs (member's band first: own policy in
  Profile, `member.age_band` in the member editor, invite preview band in Invite), responsive grid,
  labels "Tiger, mom" / "Tigre, maman" (`avatarLabel`). Playful empty states show Ollie with the
  state's emoji; the playful celebration shows the member's character (Ollie by default) with a
  trophy (goal detail passes the member's avatar).
- Tests: `src/ui/avatars/__tests__/avatars.test.ts` (132 contract keys, one SVG each, no ids,
  groups/ordering, en/fr labels). Web bundle +~0.55 MB (uncompressed) for the art.
- Backend: `User::AVATARS` still lists the 16 old keys; the new keys need the backend update from
  the contract change before they can be saved.

### 2026-10-22 - Sign-in lockout UX, forgot password, iPad, production URLs, store audience

Moe's answers (2026-10-22) in docs/PLAN.md; contract API.md changelog 2026-10-22.

- **Lockout:** `ApiError` now carries `retryAfter` (body `retry_after`, else the `Retry-After`
  header, seconds or HTTP date) and `receivedAt`; a bare 429 maps to `rate_limited`
  (`src/lib/lockout.ts`, `src/api/client.ts`, codes `rate_limited` / `login_locked` in
  `types.ts`). `useLockout(error)` (`src/features/auth/lockout.ts`) gives a live countdown
  ("Try again in 4:59" under 15 min, then whole minutes, hours from 2 h; never earlier than the
  server's time) that stops by itself. Login, sign-in code and join screens show
  `LockoutNotice` (static announced title, ticking text without live region, hint) and disable
  submit until it ends; login offers "Forgot password?" and "I have a sign-in code" (social
  buttons stay at the top), code/join offer sign-in with email (join also the sign-in code).
  `rate_limited` keeps "Too many attempts. Please wait a minute."; the texts never say whether
  an email exists.
- **Forgot password:** "Forgot password?" link under the login button → `/forgot-password`
  (email prefilled from login through an in-memory hand-off, not a URL param, so the address
  never lands in the web URL/history) → `POST /auth/password/forgot` with `locale` en/fr →
  same "Check your email" confirmation for every 202 (60 minutes, check spam) → back to sign
  in. Network errors / 429 show the usual messages (a `login_locked` would show the countdown).
- **iPhone + iPad:** `ios.supportsTablet: true`, `requireFullScreen: false`, explicit
  `UISupportedInterfaceOrientations~ipad` (all four); `orientation: portrait` keeps iPhone and
  Android portrait. Checked with `npx expo config --type introspect` (iPhone: Portrait +
  UpsideDown; iPad: all four; `UIRequiresFullScreen` false). No expo-screen-orientation needed.
- **Responsive layout:** `theme.layout` (`src/ui/themes/layout.ts`: reading 640, wide 900) with
  pure helpers `maxContentWidth`, `contentWidth`, `gridColumns`, `fitCellToHeight`. `Screen` got
  `width="reading" | "wide" | "full"` (default reading) for scroll, list and fixed modes and the
  footer. Category grids are `wide` with 2 columns on phones and up to 4 on iPad (measured
  width); the play screen is `wide` for board challenges (registry `wide`), reading otherwise.
  Sudoku and word search fit the window height in landscape (`useFitToHeight`, reserve
  `touchTarget * 6 + 260`, min cell 36). Touch targets and type scale unchanged; no device-type
  checks.
- **URLs:** `src/config/links.ts` (`EXPO_PUBLIC_WEBSITE_URL` default `https://brainyclan.com`,
  `EXPO_PUBLIC_SUPPORT_EMAIL` default `support@brainyclan.com`, privacy/terms/support/account
  deletion paths). Paywall legal links now always show (`GET /legal`, else
  `EXPO_PUBLIC_TERMS_URL` / `EXPO_PUBLIC_PRIVACY_URL`, defaulting to the website pages, opened
  with `?lang=fr` for French). Profile → About: "Help & support" (website `/support`, everyone)
  and "Email us" (mailto, not for children). `.env.example`, `eas.json` production `env`
  (`EXPO_PUBLIC_API_URL=https://api.brainyclan.com` + website/support/legal URLs).
- **Docs:** STORE.md §1 (iPad, orientation, public URLs table), §4/§5 links, §6 rewritten (Play
  target audience 6–8 → 18+, Families Policy requirements and how the app meets them, IARC
  Everyone, Teacher Approved optional; Apple not Kids Category and why, Education, 4+ answers),
  §7 deletion URL + advertising ID, §8 iPad 13" screenshots (2064×2752), §9/§10 URLs.
  README "Rewarded ads — AdMob setup": new step 8 blocking controls (sensitive categories, max
  rating G at app level, child-directed settings, mediation off, ad review center), children
  never see ads; RevenueCat legal links step updated.
- **Tests (339 → 375):** `src/lib/__tests__/lockout.test.ts` (header/body parsing, countdown
  format, clamped seconds left), `src/features/auth/__tests__/lockout.test.ts` (`lockoutOf`,
  countdown strings, `apiRequest` 429 parsing with a fetch stub),
  `src/features/auth/__tests__/forgotPassword.test.ts`, `src/ui/themes/__tests__/layout.test.ts`,
  errorMessage cases for `rate_limited` / `login_locked`; i18n parity green (new `lockout.*`,
  `forgot.*`, `profile.helpSupport*`, `login.forgotPassword`, `errors.loginLocked`).
- **Verified on web against the live backend** (it already serves the lockout): 5 wrong logins
  for a fake email → "Too many attempts / Try again in 4:48" ticking, submit disabled, Forgot
  password + sign-in code offered; forgot password → "Check your email". iPad sizes via
  exact-size iframes: Home (portrait, playful), Play categories (4 columns, 1024×1366 and
  1366×1024), Sudoku 6×6 in landscape (board + Check fit after tuning the reserve), Profile
  (sleek dark) at 390×844 and 1024×1366 with the new About rows. Not checked on web: paywall
  (native only), Sudoku 9×9 (Sam/Alex only get 4×4/6×6), French screens (strings reviewed).

### 2026-10-17 - Google UMP ad consent (F6 next-up d)

- `src/features/play/adConsent.ts`: consent gating on the `AdsConsent` API of
  react-native-google-mobile-ads 17.2 (`requestInfoUpdate` + `loadAndShowConsentFormIfRequired`,
  fallback `getConsentInfo`, `showPrivacyOptionsForm`). Gathered lazily inside
  `rewardedAds.show` right before the first ad (never at app start), before the SDK is
  initialized; passes the member's `policy.ad_request.under_age_of_consent` as
  `tagForUnderAgeOfConsent`; cached per session (failures aren't cached, so the next tap retries).
  `canRequestAds === false` → `AdError('noFill')` → existing "No video is available right now"
  path; play is never blocked. Ad requests still use `policy.ad_request` (non-personalized).
- `rewardedAd.ts` is now `createRewardedAds(importSdk)` (injectable for tests); the exported
  `rewardedAds` is unchanged for callers and gained `consent` (`noAdConsent` on web, in Expo Go and
  without an ad unit).
- Profile → Privacy → **Privacy choices for ads** (`useAdPrivacyOptions`, in `PrivacySection`):
  only when the policy allows ads in a build that can show them (same condition as the ad
  option) and UMP's `privacyOptionsRequirementStatus === 'REQUIRED'` (stored status read with
  `getConsentInfo`, no network, no message). Never for children. en + fr strings; themed via
  `useTheme` (ListRow + primary icon/spinner, danger caption), like the other Privacy rows.
- Debug: `EXPO_PUBLIC_ADMOB_CONSENT_DEBUG_GEOGRAPHY` / `EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS`
  (development builds only, `.env.example`).
- iOS: decided **no ATT prompt** — non-personalized/limited ads, IDFA never read; no
  `NSUserTrackingUsageDescription` anywhere (checked `app.json`, `app.config.ts`, the plugin's
  `userTrackingUsageDescription` option is not passed). Documented in README and `app.config.ts`.
- README "Rewarded ads — AdMob setup": new step 7 (Privacy & messaging GDPR message for
  EEA/UK/Switzerland linked to the app IDs, optional US state message, no IDFA explainer, debug
  geography + hashed test device ID, app behaviour, ATT decision); "not built yet" note removed.
- Tests: `src/features/play/__tests__/adConsent.test.ts` (16) and `rewardedAdConsent.test.ts` (3,
  mocks react-native-google-mobile-ads: no SDK init / ad request without consent, one consent
  flow per session, non-personalized request, privacy options form).
- Needs a phone check (dev build, How to test → F6 items 8–10) once the AdMob message is published.
- Checks: `npm test` 340/340, typecheck, lint, format:check green; web export bundles.

### 2026-10-17 - "Continue your game" verified on web + resume fix

Verified on web (Chrome) against the live `GET /play/sessions/current`, no console errors:

- Sam (playful): start World Geography, answer, ✕ → card on Play (hearts, "0 of 10 points · 2 of
  3 lives left", "Keep playing!") and Home (compact, above "Play now"); Continue resumes the same
  session; leaving during the feedback panel and continuing opens the next item; card progress
  follows answers without a refetch. Starting Science & Nature from a category tile while 55 was
  open → card shows the new session, 55 is `abandoned` server-side. End game: first tap → red
  "Tap again to stop this game", reverts after 4 s; two taps → card gone, session `abandoned`,
  `/play/sessions/current` returns `null`.
- Mom (modern, signed in via an API call): same loop from Play and Home; French + classic dark on
  both cards ("Reprendre votre partie", "1 point sur 10 · 3 vies sur 3 restantes", "Touchez
  encore pour terminer" wraps to two lines in the compact Home card — fine); End game from Home.

Fix: **Continue reopened an already answered item** (Sam resumed at item 1 after answering it).
The cached current-session payload keeps the items from when it was fetched (only `session` was
synced per answer), and `seedPlaySession` → `mergeItems` let its stale `answered: false`
overwrite the play cache's `true`. Now `mergeItems` never un-answers an item, and answer results
also mark the item answered in the current-session cache (`syncCurrentSession(session, itemId)`).
Pure helpers moved to `src/features/play/sessionItems.ts` (`mergeItems`, `markAnswered`) with
`__tests__/sessionItems.test.ts`.

No backend bugs found. Cleanup: test sessions 55–57 abandoned, Mom's locale/theme restored (en,
theme null, scheme system), Mom's QA token logged out, Sam's demo token left valid.

- Checks: `npm test` 321/321, typecheck, lint, format:check green; web export bundles.

### 2026-10-17 - "Continue your game" (current session)

- `useCurrentSession()` (`GET /play/sessions/current`, key `['play','current']`, 404 → `null` while
  the backend lacks the endpoint) in `src/features/play/api.ts`; `CurrentSession` type.
- `ResumeGameCard` (`src/features/play/components/`): category name, progress bar + "x of y
  points · n of m lives left" (out of lives / redemption round instead when paused), hearts on the
  Play tab; **Continue** seeds the play cache from the payload and opens `play/[session]`; **End
  game** is two-tap (turns into a red "Tap again to end it" for 4 s, no dialogs) and abandons.
  On the Play tab (top) and Home (compact, above "Play now"); hidden when there is none. Both
  screens' pull-to-refresh refetch it.
- Kept in sync without refetching per answer: answer results / second chance / redemption copy
  the session into the cached current session (`syncCurrentSession`); start, completion and
  abandon invalidate it. ✕ still just leaves (no abandon).
- Pure logic `src/features/play/resume.ts` (`isUnfinished`, `resumeCardModel`: kid copy in
  playful, progress, clamped fraction, lives/status) + `__tests__/resume.test.ts`. i18n
  `play.resume.*` en + fr (all plural forms).
- Checks: test (317), typecheck, lint, format:check green; web export bundles.
- Web check incomplete: the endpoint was still 404 and `POST /play/sessions` returned 500
  (`PlaySession::UNFINISHED_STATUSES` undefined; the backend agent was mid-change). Confirmed on
  web as Sam that the 404 hides the card on Play/Home without errors. To do: start a game, ✕,
  card on Play + Home, Continue resumes, End game (two taps) hides it; all four themes + French.

### 2026-10-17 - Regression pass finished (web) + five client fixes

Verified on web (Chrome, 1920 px and four 360 px iframes) against the live backend, no console
errors:

- Play as Sam (playful): Sudoku 4×4 (conflict highlight, wrong grid → "Not quite" + solution /
  my-grid toggle, lost heart, full session → "Target reached!" celebration with points / answered
  / mistakes), multiple choice (wrong → correct answer + explanation), three mistakes → "Out of
  lives" → redemption round (3/3 correct → lives restored, play continues), wisdom card, math
  sprint (keypad, countdown, correct auto-advances, wrong → feedback), anagram (FROG), missing
  letter (HONEY, keyboard), word search (tap first/last letter, 6 words, live caption). Home stats
  updated (week 12 → 25 pts, total, streak 1); family goal stays 0 because it is scoped to World
  Geography (correct).
- Sign-in code: Mom issues a code for Sam (countdown, share/copy/new), signed-out start → "I have
  a sign-in code" → wrong code shows `sign_in_code_invalid` text, `a84k-4dc2` is normalized to
  `A84K4DC2` and signs Sam in (playful Home). Mom → Family → Sam → devices → "Web browser" → tap
  twice → revoked (the token then gets 401). Per-member notifications (Sam, child quiet hours).
- Profile (Mom): theme Playful + text 140 % + Dark apply instantly and persist after reload
  (`PATCH /me/accessibility`, scheme in device prefs); French → whole UI + server locale, back to
  English. Notifications screen in French.
- Join with email: a stripped `accept_terms` (fetch patched in the page) gives the server 422
  under the checkbox ("Please accept the terms…"); throwaway family/owner deleted afterwards.
- Themes: playful, sleek, modern, classic × light/dark on Home, Family and a play session (incl.
  feedback panel); French on the same in classic dark; 360 px (classic FR, playful EN) on Home,
  play, Family, Profile, Goals.

Fixes:

1. **Member editor: devices list sat under "Notifications"** (`MemberEditScreen.tsx`): moved back
   into "Sign-in & devices".
2. **Profile: Notifications row had no heading** and looked like part of "Password"
   (`ProfileScreen.tsx`): own "Notifications" section header.
3. **Play header said "12 of 10 points"** once the target was passed: now "12 points · target
   reached!" (`src/features/play/progress.ts` `sessionProgressCaption`, tests in
   `src/features/play/__tests__/progress.test.ts`).
4. **French plurals for point counts**: "1 points sur 10", "Équipe : 0 points sur 100" →
   `play.progress`, `play.progressReached`, `play.failed.body`, `goals.teamProgress`,
   `goals.myProgress`, `goals.leaderProgress` are plural keys (`count`) in en + fr (French 0/1 →
   "point").
5. **Home stats broke words at 360 px** ("Aujourd'h/ui" in classic French): the stat row wraps
   instead (`HomeScreen.tsx`).

Also: `DevicesList` `platformLabel` typed with `TFunction` (the extra plural keys pushed
`ReturnType<typeof useTranslation>['t']` into TS2589 "excessively deep"). New
`src/lib/__tests__/formErrors.test.ts` covers `accept_terms` 422 mapping for join and the social
birth step.

Cleanup: throwaway family + owner deleted (`DELETE /family`, `delete_my_account`), the code
device revoked, Mom's QA session logged out, test play sessions abandoned (Sam 48–53, Mom 54),
Mom's appearance/language restored (auto theme, 100 %, en, system scheme). Sam's points earned
during the pass stay in the ledger.

- Checks: `npm test` 310/310, typecheck, lint, format:check green; web export bundles.
- Notes: content (questions) is English only in French UI (seed data, not an app bug). Mom's
  devices list has an old "claude-web-check" device from an earlier session (not removed).

### 2026-10-16 - Regression pass vs B9 (web, partial) + two client fixes

Verified on web (Chrome) against the live B9 backend with throwaway data (all deleted again):

- Register: required checkbox gates "Create account", Terms/Privacy links open
  `/legal/terms` and `/legal/privacy` (pages served, en + fr), body sends `accept_terms: true`.
- Invite preview (throwaway family): child (2017) → "Age group: Child" + required consent checkbox,
  Create disabled until ticked, POST sends `parental_consent: true`; adult (1980) → "Age group:
  Adult", no checkbox. Free-plan member limit → "reached its member limit" message.
- Re-acceptance on the real backend: an **adult who joins by invite without email** has
  `me.legal.needs_acceptance: true` (no consent row) — a reproducible way to test it. Blocking
  screen in en and fr (French summaries from `GET /legal?lang=fr`), row opens `…/legal/terms?lang=fr`
  once, "Accept" posts both current versions, then Home.
- Mom: Profile → Privacy → Download my data → `brainy-clan-my-data-2026-10-16.json` with the
  contract keys (download intercepted in the page, no file saved); second tap → "once per hour".
  Delete account: owner blocker + "Delete family" (not submitted). Alex: teen "Your family admin
  can do this" card. Home (stats + goal card), Family (members, invites, plan badge), Goals list OK.
  No console errors.
- `/account/delete` page is served (en/fr). Not linked from the app on purpose: in-app deletion
  exists (Profile → Privacy → Delete account) and the contract describes the page for people
  without the app (Play listing). Add a link only if Moe wants one.

Fixes:

1. **Public queries were cancelled on a signed-out start** (`app/_layout.tsx`): the "token
   disappeared" effect ran `queryClient.clear()` on mount without a token, aborting the in-flight
   `/health` and `/legal` requests (nginx 499); their mounted observers kept pointing at the
   removed queries and, with the React Compiler skipping re-renders, never refetched. Result: no
   Terms/Privacy links on register/join until the checkbox was tapped, and no minimum-version gate
   for signed-out users. Now the effect only clears after a real sign-out, and sign-out / account
   deletion use `clearPrivateQueries` (`src/api/clearPrivateQueries.ts`, keeps `isPublicQueryKey`
   = health + legal, drops the rest and pending mutations). Tests: `src/api/__tests__/`.
2. **`GET /legal` summaries were always English**: the app fetched `/legal` without `?lang=fr`.
   `useLegal` now asks in the app language (key `['legal', 'en'|'fr']`); `localizedLegalUrl`
   (moved to `src/features/legal/url.ts`) no longer appends a second `lang=fr` to URLs that already
   carry it. Tests: `src/features/legal/__tests__/url.test.ts`.

- Checks: `npm test` 302/302, typecheck, lint, format:check green; web export bundles.
- Note: the Chrome extension reports aborted requests (nginx 499) as status 503.

### 2026-10-16 - Unit tests (Jest + jest-expo) and bugs they found

Added a lean unit-test setup and 294 tests for the pure logic (11 suites, ~10 s warm; no network,
no device). See README "Tests".

- **Setup:** `jest-expo` ~57.0.6, `jest` ~29.7.0, `@types/jest` 29.5.14 (dev, via
  `npx expo install`); no `@testing-library/react-native` (no component tests yet). `npm test` /
  `npm run test:watch`; `jest` config in `package.json` (tests = `src/**/__tests__/*.test.ts`,
  Expo's `transformIgnorePatterns` + `standard-navigation`, which expo-router 57 imports as ESM);
  `jest.setup.ts` swaps Reanimated / Worklets / AsyncStorage for their shipped mocks;
  `jest.globalSetup.js` pins `TZ=America/Toronto`; `tsconfig.json` `"types": ["jest"]` (Expo docs).
  Tests are not bundled (router only bundles what routes import; checked in the web export).
- **Covered:** Sudoku logic (payload guard, boxes 4/6/9 incl. 6×6 [2,3] vs [3,2], row/column/box
  duplicates, notes), word logic (guards, `lineCells`/`matchSelection` in all 8 directions both
  ways, `snapToLine` + clipping, accents, shuffle), registry (every contract example playable,
  malformed payloads skipped, unknown types), `normalizeCode`/`groupCode`, `compareVersions`,
  `selectThemeKey`/`selectAccessibility`, `errorMessage` for every contract code (+ each string
  exists in en.json), goals dates (late-evening Toronto, Tokyo vs Toronto, Monday/Sunday, year
  end, DST, exclusive `ends_at`, family vs device zone, `formatTimeLeft`), notification times +
  quiet-hours defaults, answer queue (order, dedupe, AsyncStorage persist/rehydrate, flush
  order, stop on network error/timeout, retry, 409 drop + invalidate, single in-flight flush),
  en/fr parity (keys, CLDR plural forms, `{{placeholders}}`, no empty strings).
- **Bugs found and fixed (minimal):**
  1. Word puzzles: `normalizeWord` did not NFC-normalize (API.md says the server does), so a
     decomposed accent (`e` + U+0301) never matched a precomposed `É` in the word search, and
     anagram/missing-letter showed it as two characters. Now `normalize('NFC')` first.
  2. Challenge registry: `isChallengeTypeSupported` used `type in registry`, so an item type
     like `constructor` / `toString` counted as supported and `isPlayable` threw
     ("isValidPayload is not a function") instead of skipping it. Same pattern in `isThemeKey`
     (`ui_theme: "toString"` would have selected a non-theme). Both use own-key checks now.
  3. Goal period labels were formatted in the **device** zone; API.md defines the bounds as
     family-timezone midnights, so on a device in another zone (travel, relatives abroad) the
     week showed e.g. "Oct 11 – Oct 18". `formatDate`/`formatPeriodRange` take an optional
     `timeZone`; the goal detail (current period + history rows) passes the family's.
  4. `compareVersions("1.2.3-rc.1", "1.2.3")` returned 1 (the `.1` of the suffix counted as a
     4th part), contrary to its doc; suffixes after `-`/`+` are dropped first now.
  5. fr.json lacked the CLDR `many` plural form for `play.worth`, `challenge.math.secondsLeft`,
     `billing.unlockMembers/Categories/Goals` (i18next would show the raw key for e.g. 1 000 000);
     added (same text as `_other`, like the other 21 `_many` keys).
- `defaultQuietHours` moved from `NotificationsScreen.tsx` to `notifications/time.ts` (testable).
- Checks: `npm test` 294/294, typecheck, lint, format:check green; web export bundles; expo-doctor
  21/21.

### 2026-10-16 - F7 release prep + legal clarifications (client)

- Legal (contract "Legal clarifications"): `types.ts` gains `LegalDocument.summary`,
  `MeLegal.accepted_*_version`, `InvitePreview`, a typed `MeExport`. Invite form uses
  `useInvitePreview` (`src/features/family/hooks.ts`, debounced via `src/lib/useDebouncedValue.ts`,
  key `invite-preview`) and shows the consent checkbox only when `parental_consent_required`
  (404/error → previous optional checkbox). `LegalUpdateScreen` reads current + accepted versions
  from `me.legal`, marks changed documents and shows `summary`. Export saves the envelope's `data`
  and names the file after `exported_at`. New en/fr strings.
- Verified on web (B9 not served yet): preview 404 → optional checkbox, debounced (one request
  for the final month); required/not-required paths with an in-page fetch stub (child → required
  checkbox + disabled Create until ticked; teen → no checkbox). No invite created; the test login
  was logged out again. The re-acceptance screen is only type-checked (couldn't force a `/me`
  refetch with the stub) — check against B9.
- Release prep: `app.json` — `runtimeVersion: fingerprint`, `ios.infoPlist.ITSAppUsesNonExemptEncryption:
false`, `supportsTablet: false`, removed the template `ios.icon` (`assets/expo.icon` deleted →
  expo-doctor 21/21), Android `blockedPermissions` (SYSTEM_ALERT_WINDOW, READ/WRITE_EXTERNAL_STORAGE),
  expo-secure-store `faceIDPermission: false` (no Face ID string), splash 200 dp on brand blue with
  a dark variant, adaptive background colour. `expo-updates` added (`npx expo install`);
  `app.config.ts` derives `updates.url` from `extra.eas.projectId` once `eas init` ran.
  `eas.json`: channels per profile, preview APK, `submit.production` placeholders (iOS ascAppId /
  appleTeamId, Android internal track as draft).
- Brand: original owl mascot `assets/brand/owl.svg`; `scripts/render-brand.mjs`
  (`npm run brand:render`, devDependency `@resvg/resvg-js`) renders icon, adaptive layers,
  monochrome, splash, favicon, Play feature graphic and `assets/brand/icon.svg`.
- `docs/STORE.md`: identity, builds/OTA, EN + FR listings, category/audience/age rating, Apple
  privacy label + Play data safety, screenshot plan, review notes, release checklist.
- Checks: typecheck, lint, format:check green; `npx expo export --platform web` bundles;
  expo-doctor 21/21; `expo config --type public` sane.
- Open questions for Moe: (1) approve or replace the owl mascot ("Ollie"); (2) iPad: keep
  `supportsTablet: false` for v1?; (3) Play target audience: include under-13 age groups (Families
  Policy) or declare 13+ with children only via a parent's family?; (4) Play requires a web URL
  for account-deletion requests — backend page needed; (5) production review account and support
  email/website URLs; (6) EU/UK release needs the Google UMP consent form (not built).

### 2026-10-16 - F7: legal, consent and privacy (B9 client) + Sentry

Built against the B9 contract (backend not served yet; everything degrades when fields/endpoints
are missing):

- Types: `LegalInfo`, `MeLegal` (`me.legal?`), `LegalAcceptanceBody`, `MeExport`,
  `AdRequestPolicy` (`policy.ad_request?`), `accept_terms` on register/join/social bodies,
  `parental_consent` on invites. New `Checkbox` control in `src/ui` (`aria-checked` on web).
- `src/features/legal/`: `useLegal` (404 → null, links hidden), `openLegalPage` (expo-web-browser,
  `?lang=fr`), `AcceptTerms` + `LegalLinks`, `LegalUpdateScreen` (route `legal-update`, root guard
  `needsLegal` = signed in + `me.legal.needs_acceptance` + not `policy.is_child`, blocks the
  onboarding/tabs groups), `useAcceptLegal` (POST with the `GET /legal` versions, falling back to
  `me.legal`), `PrivacySection` in Profile (terms/privacy rows, Download my data, Delete account
  moved here), `useExportMyData` (`saveExport.web.ts` blob download, `saveExport.ts` expo-file-system
  - expo-sharing; 429/403/404 messages).
- Sign-ups send `accept_terms: true` (register, join with email login, social birth step); the
  server's 422 field error shows under the checkbox. Invite: see Known issues for the consent
  choice.
- Paywall legal links use `GET /legal` first, env URLs as fallback (in-app browser).
- Rewarded ads read `policy.ad_request` (request config re-applied per ad).
- Sentry (`@sentry/react-native` 7.11 via `npx expo install`): `src/features/app/sentry.ts` (off
  without `EXPO_PUBLIC_SENTRY_DSN`; `sendDefaultPii: false`; bodies/headers/query strings and
  console breadcrumb text scrubbed; user = member id only; no screenshots/tracing), root wrapped
  with `Sentry.wrap` only when on, `metro.config.js` with `getSentryExpoConfig`, config plugin in
  `app.config.ts` only when `SENTRY_ORG` + `SENTRY_PROJECT` are set; README section.
- Also installed `expo-sharing`, `expo-file-system` (`npx expo install`).
- Checks: typecheck, lint, format:check green; `npx expo export --platform web` bundles
  (route `legal-update` exported; the "Something prevented Expo from exiting" line appears with
  or without the Sentry metro config); expo-doctor 20/21 (known ios.icon false positive).
- Verified on web (Mom): register checkbox gates "Create account"; invite checkbox toggles;
  Profile → Privacy hides terms rows with `/legal` 404 and shows "isn't available yet" for the
  export. Through a local mock proxy adding `me.legal` / `/legal`: blocking screen appeared,
  Accept posted `{terms_version, privacy_version}` and routed home; Privacy shows the terms rows.
  The web export download and the native share sheet were not exercised (no B9 export yet).
  Test session signed out.
- Contract gaps (for the coordinator): no pre-invite signal for `parental_consent`; whether
  `me.legal.*_version` are the user's accepted or the current versions (the app posts the
  `GET /legal` versions); no "what changed" summary for re-acceptance; no explicit export flag
  ("adults"); `GET /me/export` body shape/envelope unspecified (saved as returned).

### 2026-10-16 - F6 RevenueCat paywall + AdMob rewarded ads, small fixes

- Contract (2026-10-16 changelog): `Member.has_own_login`, `ad_reward_pending` error code,
  `POST /family/subscription/sync`, app-generated `reward_ref`. Types updated.
- Delete family counts use `has_own_login` (fallback: email login when the server doesn't send it
  yet); copy now says "without their own login (email, Google, Apple or Facebook)" (en + fr).
  Verified on web as Mom: live server (no flag yet) → 2 erased / 1 kept; with the flag simulated
  for Alex (fetch patch in the tab) → 1 erased / 2 kept. Nothing submitted.
- `ToggleRow` knob: classic dark used `surface` (invisible on a card) → off knob = `text`, on knob =
  `onPrimary`; and on web the "on" knob was react-native-web's default teal in every theme
  (`thumbColor` is ignored when on) → `activeThumbColor` passed on web. Checked computed colours in
  all four themes light + dark at `/dev/themes`.
- **RevenueCat** (`react-native-purchases` 10.14 via `npx expo install`, no config plugin):
  `src/features/billing/store.ts` (lazy SDK import, configure once with the platform key, `logIn`
  as `revenuecat_app_user_id`, offerings → packages annual first, purchase / restore with
  cancel + error mapping, `logOut` on sign-out) and a `store.web.ts` stub. Paywall
  `app/family-plan.tsx` → `PaywallScreen`: unlocks (policy limits), store-priced packages,
  Subscribe, Restore purchases, renewal disclosure, terms/privacy links from env (hidden when
  unset); after a purchase/restore `waitForFamilyTier()` polls sync/GET every 2 s for ≤30 s, then
  refetches `/me`, family, categories → celebration or "Almost there". Plan card: "See the Family
  plan" when RevenueCat is available, else the old disabled button. Only adult admins with
  `purchases_allowed`.
- **AdMob** (`react-native-google-mobile-ads` 17.2 + config plugin in `app.config.ts`, app IDs
  from `ADMOB_IOS_APP_ID` / `ADMOB_ANDROID_APP_ID`, Google sample IDs as defaults, Google's
  SKAdNetwork id, no ATT): `src/features/play/rewardedAd.ts` (lazy import, non-personalized, G
  rating, SSV `userId` = member id, `customData` = `"<reward_ref>:<session_id>"`) + web stub.
  `useAdSecondChance` makes a UUID v4 (`expo-crypto`), shows the ad, then claims with
  `method: "ad"`, retrying 409 `ad_reward_pending` / 5xx / network every 2 s for ~20 s; an earned
  but unconfirmed reward is kept for the next tap. Option shown only when
  `policy.second_chance.ad_allowed` && session `ad_available` && the build can show ads.
  The old `PLACEHOLDER_AD_REWARD` is gone.
- README: step-by-step RevenueCat and AdMob setup; `.env.example` placeholders; CLAUDE.md native
  modules note updated.
- Web checks (Mom, session logged out after): `/family-plan` → "only in the app" state; Plan card
  for the family tier unchanged ("Family plan"); no RevenueCat/AdMob code in the web export. The
  free-tier "coming soon" button could not be shown live (The Demos is on the Family tier and the
  cached subscription query didn't refetch under the fetch patch) — logic unchanged on web.
- typecheck, lint, format:check green; `expo export --platform web` bundles; expo-doctor 20/21
  (known `ios.icon` false positive); `expo config --type prebuild` resolves the AdMob plugin.
- Not verifiable here: real purchases, offerings, restore, ads, SSV — need a dev build and the
  store/RevenueCat/AdMob accounts (phone checklist in How to test → F6).

### 2026-10-16 - Account deletion verified against live B6c

- Mom (owner of The Demos): Profile → Delete account shows the `family_owner` card + "Delete
  family" link; Delete family shows the counts, the button stays disabled until the exact name is
  typed, "Also delete my account" switches the button label. Nothing submitted for the demo family.
- Alex (teen, demo token): Delete account shows only the "Your family admin can do this" card
  (`child_account`).
- Throwaways (registered via the API, now all deleted): owner-only family with an App Store
  subscription (RevenueCat fixture webhook to `family-<id>`) → store notice + "family is deleted
  too" → typed DELETE → Welcome "Your account was deleted", token 401, login gone. Second owner →
  Delete family without the account → create-family onboarding; again with "Also delete my
  account" → Welcome "Your account was deleted".
- Fixed: Delete family without the account option stayed on the screen with "You need to join or
  create a family first": `queryClient.clear()` dropped the `me` query the root layout observes,
  so the guard never saw the new `/me` (no family). Now every query except `me` is removed and
  `me` is updated in place (`src/features/account/hooks.ts`).
- Fixed: Delete family counts were wrong for The Demos ("1 child erased, 2 adults kept") — the
  server erases every account without an email login, so Alex (teen, code sign-in) is erased too.
  Now "N members without their own email login are erased" / "N other members with an email login
  keep their accounts", zero-count lines hidden (new keys `familyPointErased`, `familyPointKept`,
  en + fr; old `familyPointChildren`/`familyPointAdults` removed).
- Fixed: teens saw the adult "What happens" list, subtitle and store notice (vous) above the tu
  "ask your admin" card; with `child_account` only that card is shown now.
- Checked playful, sleek, modern, classic light + dark at 360 px and French: no overflow or
  untranslated strings. Demo settings restored (Mom theme null + locale en, Alex locale en), test
  session logged out. typecheck, lint, format:check green; web export bundles.

### 2026-10-15 - Account and family deletion (F6 / store compliance), Apple authorization code

- Contract "Account deletion": types `DeletionCheck`, `DeleteAccountBody`, `DeleteFamilyBody`,
  `SocialSignInBody.authorization_code`; query key `deletionCheck`; error
  `family_owner_cannot_leave` (en + fr). `api.delete(path, body?, options?)` now takes a body
  (the one caller with options, push-token unregister, updated).
- `src/features/account/`: `hooks.ts` (`useDeletionCheck` always fresh, `useDeleteAccount`,
  `useDeleteFamily`, `signOutAfterDeletion` = flag + answer queue + drafts + token + query cache;
  no `/auth/logout` since the server already revoked every token), `DeleteAccountScreen`,
  `DeleteFamilyScreen`, `parts.tsx` (bullet, store-specific "cancel your subscription" notice).
  Routes `app/delete-account.tsx`, `app/delete-family.tsx` (family-guarded stack).
- Profile → "Delete account" (ghost button under Sign out) hidden when `policy.is_child`. Screen:
  what's erased, history anonymised as "Deleted player", family deleted too when
  `deletes_family`, store notice when `active_subscription` (App Store / Google Play / generic),
  `family_owner` blocker → explanation + "Delete family" link, else type DELETE (no dialogs).
- Family → "Delete family" (owner only: `family.owner_user_id === user.id`): counts children
  erased / other adults kept, "Also delete my account" toggle, confirm by typing the family name.
  Without the account option the cache restarts from a fresh `/me` (no family) so the guard shows
  create-family; with it → full sign-out. Welcome shows "Your account was deleted" (transient
  `appStatus.accountDeleted`, dismissible).
- Apple: `authorizationCode` from the native result is sent as `authorization_code` on
  `/auth/social/apple` and on the Apple link call.
- Verified on web (backend endpoints still 404): Delete family screen as Mom renders correctly
  (1 child erased, 2 adults kept, typed-name button disabled); Delete account shows the error
  state while `/me/deletion-check` is 404. Deletion flow itself not run (no live endpoint).
  typecheck, lint, format:check green; web export bundles.

### 2026-10-15 - F6 admin notification settings per member + "no quiet hours"

- `useNotificationPreferences(memberId?)` / `useUpdateNotificationPreferences(memberId?)`: without
  an id `/me/notification-preferences` (404 → `null`, entry hidden); with an id the admin
  `/family/members/{id}/notification-preferences` (key `memberNotificationPreferences(id)`; 403/404
  are not retried and show "not allowed" / "not found"). Same optimistic PATCH + rollback.
- `NotificationsScreen.tsx` now renders a shared `NotificationSettings`; new
  `MemberNotificationsScreen` at route `app/member-notifications/[id].tsx` (admins only), opened
  from a "Notifications" row in the member editor.
- Quiet hours have an on/off switch: off sends both `null` (contract: both null = off, one → 422),
  hides the time pickers; on restores the last times of this visit or the contract defaults
  (child 19:30–07:30, others 21:30–07:00). New en/fr strings `quietToggle`, `quietOff`,
  `memberSubtitle`, `memberEntryHint`.
- Verified on web against live B8 (see Next up 0a); all changed preferences restored afterwards.
  typecheck, lint, format:check green; `npx expo export --platform web` bundles.

### 2026-10-15 - F6 push registration + notification deep links

- `npx expo install expo-notifications` (~57.0.23; `expo-device` was already installed); plugin in
  `app.json` (introspect shows `aps-environment`).
- `src/features/notifications/push.ts` (native) / `push.web.ts` (no-ops): support check (not Expo
  Go, real device, EAS `projectId` from `expoConfig.extra.eas` / `easConfig`), foreground banner
  handler, Android `default` channel, permission read/request, `getExpoPushTokenAsync` →
  `PUT /me/push-token` (deduped per run), `DELETE /me/push-token` in `useSignOut` before logout
  (best effort, 4 s), token-change listener, tap listener incl. `getLastNotificationResponseAsync`.
- `usePush.ts`: `usePushRegistration(signedIn)` (sends the token only if already granted, never
  prompts), `useNotificationDeepLinks` (enabled once the tabs group is mounted),
  `usePushPermission` (refreshed on app foreground), `askAfterSessionIfUndecided` (PlayScreen on
  `completed`; only while the OS has never asked).
- Notifications screen: "Notifications are off" card with **Turn on notifications**, or **Open
  settings** when the OS no longer prompts. i18n en + fr.
- typecheck, lint, format:check green; web export bundles; expo-doctor only the known `ios.icon`
  false positive. Not run on a device (needs an EAS dev build + `projectId`).

### 2026-10-15 - F4c Sign in with Apple + F6 check against live B8

- `npx expo install expo-apple-authentication` (~57.0.2); `ios.usesAppleSignIn: true` and the
  plugin in `app.json` (`expo config --type introspect` shows the `com.apple.developer.applesignin`
  entitlement). `SocialProvider` gains `apple`; `SocialSignInBody.nonce`.
- Social code extended, not duplicated: token sources now return a `ProviderCredential`
  (`token`, Apple-only `nonce` and `displayName`); `useSocialSignIn` / `useLinkSocialAccount` send
  `nonce` (+ `display_name` on sign-in). The credential is kept for the `social_signup_incomplete`
  birth-step retry, so Apple's one-time name is still sent with the birth data.
- `useAppleToken`: shown only when `providerConfigured('apple')` (iOS, not Expo Go) and
  `isAvailableAsync()`; 32 random bytes hex nonce → SHA-256 → `signInAsync({ FULL_NAME, EMAIL })`;
  `ERR_REQUEST_CANCELED` → `null` (no error); `display_name` = given name (backend also defaults to
  the first name).
- `AppleButton`: Apple's `AppleAuthenticationButton` ("Continue with Apple", localized by iOS),
  BLACK on light / WHITE on dark, height = theme touch target (≥ 44), corner radius from the theme
  clamped to 0…height/2 (capsule in playful). Apple first in the list (App Review: at least as
  prominent). Profile → Sign-in methods: Apple row with a black tile + Apple logo and Apple's
  button to connect. Strings: "Apple, Google or Facebook" in token-invalid, birth step and hint (en+fr).
- README "Sign in with Apple — setup". Contract gap: backend `.env.example` example uses
  `com.brainyclan.app`, the app's bundle ID is `app.brainyclan`.
- F6 on web against the live backend (Mom, already signed in in Chrome): Family tab → **Plan**
  card shows "Family plan" (tier `family`, status `none` → no badge/dates/store, no unlocks list);
  Profile → Notifications stays hidden (`/me/notification-preferences` 404); no console errors.
  Sign-in methods and Apple hidden on web as intended.
- `npx expo install --fix`: patch updates (expo 57.0.30, expo-router 57.0.28, …).
- Checks: typecheck, lint, format:check pass; `npx expo export --platform web` bundles.
  expo-doctor 20/21: the schema check now reports `ios.icon - cannot access file at
'./assets/expo.icon'` (Icon Composer folder from the template; a newer doctor's asset check
  expects a file). Not changed: the folder is the valid SDK 57 iOS icon format; revisit if EAS
  complains.
- Not verifiable here: everything Apple (needs an iPhone dev build and the Developer Program).

### 2026-10-14 - F6 start: plan status + notification settings

- Types (`Subscription`, `NotificationPreferences`, update/push-token bodies) from API.md B8; query keys
  `subscription`, `notificationPreferences`.
- `src/features/billing`: `useSubscription` (admins, never children; 404 → `null` = hidden) and
  `SubscriptionCard` on the Family tab: tier, status badge, renews/expires date, store; on the free
  tier it lists what the Family plan unlocks from `policy.limits` (no hard-coded numbers) and a
  disabled "Upgrade - coming soon" button (only when `policy.purchases_allowed`).
- `src/features/notifications`: `useNotificationPreferences` (404 → `null`), optimistic
  `useUpdateNotificationPreferences` (rollback + refetch on error; server value applied only when no
  other toggle is in flight). `/notifications` screen (Profile → Notifications, entry hidden while
  the endpoint 404s): four type toggles, reminder time (shown when the daily reminder is on), quiet
  hours from/until; times use hour + minute steppers (15-min steps), so they work on web. en + fr.
- Not verified: nothing run in a browser or against the backend (B8 was being built in parallel);
  only typecheck, lint, format:check and `expo export --platform web` (green). Push registration not
  started.

### 2026-10-11 - Accessibility, classic/French visual pass, FlashList, README

- **Word search playable with a screen reader / keyboard**: every letter is a button
  (`LetterCell`, label "Row 2, column 3, K" / "…, part of CAT", hint "Choose the first letter
  of a word, then its last letter"); choose the first, then the last letter (exact cells, no
  snapping). With VoiceOver/TalkBack on, the drag/tap gesture is switched off and the cells take
  the touches; otherwise they are inert and the gesture works as before. The status caption
  (live region) now also says "C chosen as the first letter…" and "Found CAT! 1 of 5 words
  found." (spoken with `announceForAccessibility` on iOS, which has no live regions). Word chips
  are `accessible`; the grid label moved into the help text's label. Anagram: used tiles read
  "R, used" instead of a blank. Sudoku, Math Sprint and missing-letter labels checked (already
  labelled). Verified on web: keyboard Enter on C then T found CAT with the announcement;
  pointer tap-tap still works.
- **Text scale in puzzles**: `useCellFont` (member text scale × OS font scale up to 1.4, capped
  at a share of the cell) for Sudoku digits, word-search letters, anagram tiles, missing-letter
  boxes and pad keys. Sudoku 9×9 at 360 px with 120 % text: 30 px cells, 20 px digits, no
  overflow.
- **Goal history -> FlashList**: `Screen` got a `list` render prop (title block + children
  become the list header; screen padding and pull-to-refresh are passed in; no ScrollView
  around it). The goal detail screen is now one FlashList: details as header, history rows as
  items (one card per period), "Load more" + admin actions as footer, next page loads near the
  end (`onEndReached`); pull-to-refresh also refetches the history. Checked on web with 3 faked
  history pages: pages 1-2 loaded while scrolling, no VirtualizedList warnings. Other lists are
  bounded (family members, invites, goals); devices are not paginated by the API (Next up).
- **Classic theme (light + dark) and French at 360 px** (app in a 360 px iframe, overflow and
  truncation scripted + screenshots) on Profile (password, appearance, devices), member editor
  (email login, sign-in & devices), sign-in code screen, goal detail, Home, Family and all
  puzzle samples. Fixes: `Button` titles wrap to a second line (minHeight) instead of being
  cut ("Change pass…"); device rows and sign-in method rows put the action under the text
  (names and "Vu il y a…" were squeezed to "Web bro…"); `ListRow` titles 2 lines, subtitles 3;
  theme picker check moved into the preview's corner and the Automatic tile gets its own row on
  phones ("Automatiq/ue" broke mid-word); `Badge` never wider than its container ("Formule
  Famille" overflowed the locked category tile, whose header now wraps); `TextField` input
  `minWidth: 0` (web pushed the eye icon out of the field); social buttons wrap ("Continuer
  avec Goo…"); Home ranking and race names wrap ("Mom (vo…"); the web device-name fallback is
  translated ("Navigateur web"). No missing fr keys; identical en/fr values are brand names or
  real cognates. Signed-out screens (code entry, login) always use modern, checked earlier.
- **README** refreshed: prerequisites, `.env`, Expo Go (`npm start`) vs development build
  (`npm run start:dev-client`), web on 8081 (incl. a localhost API), theme preview, demo logins,
  sign-in-code and invite flows, demo tokens on web (and why not to sign out with them), checks,
  project structure; links to the social sign-in setup.
- Test state restored: Mom's theme / reduced motion / locale reset (theme null, reduced motion
  off, locale en), Mom's test session logged out; two unused sign-in codes (Alex, Sam) were
  issued and simply expire.
- typecheck, lint, format:check green; `npx expo export --platform web` bundles.

### 2026-10-11 - F5 against the real B7 backend, quality and performance pass

- Played on web (Chrome, `#root` narrowed to 360/390 px) against http://localhost:8080 (B7):
  Sam (playful): 4×4 Sudoku correct (+3, `points_awarded` 3) and wrong (solution diff, struck
  digit, Solution / My grid), notes + draft survive a reload, session completed with 12/10 points
  (results 12 / 5 answered / 1 mistake), Home stats matched `/me/stats` (week 55, today 19,
  total 90, streak 5; the Pizza Friday goal is scoped to World Geography, so it rightly stayed
  at 36). Fractions: `10/12` for `2/6 + 3/6` correct (equivalent fraction, auto-advance), wrong
  answer shows `2/3`, mixed math_sprint + multiple choice items, failed -> redemption round
  (math items) -> back to active. Anagram correct (typed) and wrong (`RED` shown). Missing
  letter correct/wrong, two blanks. Word search: tap-tap incl. reversed words (server accepts
  them), auto-submit when all found (+3), give up with dashed missed bands. Mom (modern): 9×9
  correct (+8) at 360 px; modern dark: notes, clashes, selection readable. Alex (sleek dark):
  word search give up + missed bands. 6×6 and the rest of the payload/422/409 shapes checked
  with a script against the API (sudoku 6×6 = 5 points, incomplete grid = mistake, malformed
  grid / found entry = 422 with a field message, re-answer = 409, payloads stable on re-fetch,
  equivalent fractions and `7/1` for `7` accepted, decimal answers e.g. `195.5`).
  No negative answer occurred in the generated sets.
- Fixed: Sudoku cells are a memoized `SudokuCell` (primitive props, stable `onSelect`), and
  `submitted` / `solution` are memoized. Dev-only render counter `useRenderCount`
  (`globalThis.__renderCounts`). Measured on a 9×9: a tap re-rendered **500-700** cell renders
  before, **21** (first selection) / **38** (moving the selection) after.
- Fixed (root cause of the above on desktop web): a scrollbar appearing/disappearing changed the
  measured width -> grid resized -> page height changed -> scrollbar toggled (layout loop, every
  cell re-rendered ~9 times per tap). `Screen` now sets `scrollbar-gutter: stable` on web.
- Fixed: long button titles overflowed both edges on a 360-390 px phone ("Use a free second
  chance (3 left today)"): `Button` label shrinks (native `adjustsFontSizeToFit`) / ellipsizes;
  shorter strings `play.failed.free` (en + fr). Word search give up: the confirm button says
  "Tap again to give up", the "counts as a mistake" note moved to the caption
  (`challenge.word.giveUpHint`, en + fr).
- Fixed: missing-letter first keystroke. The slots mount after the first layout and `autoFocus`
  on slot 0 could land late (after early typing), pulling focus back to slot 0. Now an effect
  focuses the first empty slot once the slots exist, and on web a letter typed while nothing is
  focused goes to the first empty slot (`useWebKeys`, Enter submits). Web focus ring uses the
  theme color instead of the browser's black outline.
- Checked: fr.json has every en.json key; a11y labels exist on Sudoku cells (row, column,
  value, given, selected), pad keys, notes, anagram tiles/slots, missing-letter slots, math
  answer + keys, word-search grid and word chips. FlashList: not used anywhere yet and no FlatList either; the lists are short (members <= 7, categories, goals, devices) and render with `map`. The first candidate is goal history (20 per page, grows with "load more") - not converted in this session.
- **Backend bugs (B7), for the backend agent:**
  1. `POST /play/sessions` `{ "category_id": 28 }` as Alex (teen, policy difficulty 3-8) ->
     **500** `SQLSTATE[22003] BIGINT UNSIGNED value is out of range in
(content_items.difficulty - ?)` from `ORDER BY ABS(content_items.difficulty - 5)` (unsigned
     column minus the target goes negative). Expected 201. Fix: `ABS(CAST(difficulty AS SIGNED)
     - ?)`. Same query is used for any category with content difficulties below the member's
       target. (Sam and Mom could start 28 at the time.)
  2. Generated math items repeat inside one session: session 39 (Fractions, Sam) had items 398
     and 400 both `1/3 + 1/3` (plus multiple-choice item 404 "What is 1/3 + 1/3?"). Expected:
     no duplicate question within a session.
  3. "Simplify a/b" math items accept unsimplified equivalents: `Simplify 21/24` accepted
     `14/16` (correct_response `7/8`). The contract says equivalents count, but for a
     simplify question that makes it trivial; either require lowest terms for these or don't
     generate them.
  4. (Question) Sam (child) sees the 9×9 subtree (44-46); fine if intended (Alex/Mom also get
     "Hard" 47, Sam does not).
- Not verified: a phone, drag on word search (the automated window can't drag; tap-tap used),
  French screens visually (keys checked by script), classic theme for the new UI (previous
  session), negative math answers from the real generator.
- Test data: reduced motion was switched on for Sam/Alex/Mom during the run and switched back
  off. Two Mom devices created by this session ("probe", "web test") are still signed in
  (revoking them was blocked for the agent) - sign them out in Family -> Mom -> devices.
- Checks: typecheck, lint, format:check pass; `npx expo export --platform web` bundles.

### 2026-10-11 - F4b Google and Facebook sign-in (mock-verified), Math Sprint ±

- Math Sprint (B7 clarification "negative answers in every format"): ± key for decimal and
  fraction answers too; their bottom row is `± 0 . ⌫` / `± 0 / ⌫` (four narrower keys).
- **Decisions (for PLAN.md "Social sign-in"):**
  1. Google on iOS/Android: `react-native-nitro-google-signin` (MIT, config plugin, Android
     Credential Manager + iOS GoogleSignIn SDK, returns the ID token). Not the free
     `@react-native-google-signin/google-signin`: its free tier is built on the deprecated legacy
     Android Google Sign-In SDK (Credential Manager and web are paid "Universal" features).
     Expo's Google guide lists both. The nitro API mirrors the paid one, so a swap later is small.
  2. Google on web: OpenID Connect implicit flow (`response_type=id_token` + nonce) in a popup
     with `expo-auth-session` (generic `useAuthRequest`, not the deprecated provider helpers) ->
     the same ID token as native. Redirect `<origin>/oauth-callback` (route `app/oauth-callback`,
     `WebBrowser.maybeCompleteAuthSession()` in the root layout).
  3. Facebook everywhere (iOS, Android, web): the Facebook Login dialog in the system browser /
     popup via `expo-auth-session` -> a normal user **access token** (what the contract
     expects); native redirect `fb<APP_ID>://authorize`. Not `react-native-fbsdk-next`: no web
     support, and on iOS without App Tracking Transparency consent the SDK falls back to Limited
     Login, which returns an OIDC authentication token instead of an access token (the contract
     wouldn't accept it). It also keeps the Facebook SDK (app events, IDFA, client token) out of
     a family app. Trade-off: no one-tap login through the installed Facebook app.
  4. Buttons only render when the provider is configured and can run (Expo Go -> hidden, no iOS
     client ID -> Google hidden on iOS). Dev-only fake provider (`EXPO_PUBLIC_SOCIAL_FAKE=1`,
     behind `__DEV__`, absent from the production web bundle).
  5. Visibility of Profile -> Sign-in methods: policy `collect_email` (bands that may
     self-register = adults/seniors); no age logic in the app.
  6. The app moves to an EAS **development build** for native sign-in: `expo-dev-client`,
     `eas.json` (development / development-simulator / preview / production, with EAS
     environments), `npm start` = Expo Go, `npm run start:dev-client` = dev build.
- Packages (`npx expo install`): `react-native-nitro-google-signin` 2.3.0 +
  `react-native-nitro-modules` 0.37.1, `expo-auth-session`, `expo-crypto`, `react-native-svg`,
  `@expo-google-fonts/google-sans` (Google's button font), `expo-dev-client`.
- Config: `app.config.ts` (dynamic, on top of `app.json`); `.env.example` gains
  `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`,
  `EXPO_PUBLIC_FACEBOOK_APP_ID` (+ commented `EXPO_PUBLIC_SOCIAL_FAKE`).
- Code: types (`SocialProvider`, `SocialSignInBody`, `SocialAccount`, 4 error codes + messages),
  `src/features/auth/social/` (`config`, token hooks `useGoogleToken` (native) /
  `useGoogleToken.web`, `useFacebookToken`, `useBrowserOAuth`, `useSocialProviders`, `api`
  (sign in / list / link / unlink), `SocialButton` + `BrandLogos` (inline SVG), `SocialSignIn`
  (buttons + birth-step modal), `SignInMethods` (Profile), `OAuthCallbackScreen`),
  `src/ui/brand.ts` (provider-mandated colors, the only hex outside themes), buttons on
  welcome / login / register, samples on `/dev/themes`, strings en + fr, README setup guide.
- Branding: Google light/dark button per Google's spec (#FFFFFF/#747775/#1F1F1F,
  #131314/#8E918F/#E3E3E3), standard "G", Google Sans Medium, "Continue with Google";
  Facebook #1877F2 with the white "f" logo. Height/shape/text size from the theme (pill in
  playful, rounded elsewhere; classic keeps its large target).
- Verified in Chrome (web) against `social-mock.js` (scratchpad) on :8091 -> real backend:
  fake Google -> 422 `social_signup_incomplete` -> birth step -> 2012 -> field error -> 1988 ->
  retried with the same token (+ `birth_year`, `birth_month`, `locale`) -> signed in; Facebook
  (linked) -> signed in; 401 `social_token_invalid` message; Profile connect Google, disconnect
  (tap twice), `last_sign_in_method` and `social_account_taken` messages. With dummy client IDs
  (no fake): the Google request is `accounts.google.com/o/oauth2/v2/auth` with
  `response_type=id_token`, nonce, `prompt=select_account`, redirect
  `http://localhost:8081/oauth-callback`; Facebook `facebook.com/v23.0/dialog/oauth` with
  `response_type=token`, `public_profile email`; a blocked popup shows "Google sign-in didn't
  work"; a simulated popup returning to `/oauth-callback#id_token=...` completed the hand-off
  (popup closed, token posted, birth step). Without any IDs nothing is rendered. Themes: modern,
  playful, sleek dark, classic dark.
- Not verified (needs real credentials / a dev build / B6b): native Google (nitro) and the
  Facebook browser flow on Android/iOS, the `fb<APP_ID>://authorize` redirect, the real Google /
  Meta consoles, the real backend endpoints.
- Contract gaps / questions (API.md not edited):
  1. Google ID-token audience: Android and web tokens are issued for the **Web** client ID; iOS
     tokens may carry the iOS client ID. The backend must accept both; document it.
  2. `SocialAccount.email`: can it be `null` (Facebook account without email / declined
     permission)? Typed `string | null`.
  3. Facebook: the app sends a browser-OAuth access token (fine). If the native Facebook SDK is
     ever used on iOS, Limited Login returns an OIDC JWT instead; the contract would need it.
  4. New social user without `display_name`: the app doesn't send one (server takes the
     provider's name?) - confirm. The app sends `locale` only together with the birth data.
  5. Sign in with Apple (App Store guideline 4.8) needs an `apple` provider in the contract
     before the iOS release.
- Checks: typecheck, lint, format:check pass; `npx expo export --platform web` bundles (no
  `dev-fake` in the output); `npx expo-doctor` 21/21.

### 2026-10-11 - F5 challenge components (mock-verified), contract follow-ups

- Contract updates: `Member.email_login_allowed` (the member editor shows the email login field
  when it is true or the member already has an email; older APIs fall back to "not a child");
  `DELETE /goals/{plan}` soft delete: the plan is dropped from the cached list at once (no prefix
  invalidation that would refetch the open detail), a 404 on delete counts as done, and a goal
  detail answering 404 shows "This goal was deleted" with **Back to goals** and removes it from
  the list cache; delete hint text updated. `SessionItem.points` typed; the play card shows
  "+N" when an item is worth more than 1; feedback uses the server's `points_awarded`.
- Types from API.md: `SudokuPayload/Response`, `MathSprintPayload/Response`,
  `AnagramPayload`, `MissingLetterPayload`, `WordSearchPayload`, `WordPlacement`, responses.
- `src/challenges/`: `sudoku/logic.ts` + `sudoku/Sudoku.tsx`, `MathSprint.tsx`,
  `words/logic.ts` + `Anagram.tsx`, `MissingLetter.tsx`, `WordSearch.tsx` (gesture-handler Pan
  raced with Tap), `words/WordPuzzle.tsx` (variant switch); shared `PadKey`, `useMeasuredWidth`,
  `useWebKeys` (keyboard on web, only when focus is in the challenge or nowhere) and `drafts.ts`
  (persisted per-item drafts in AsyncStorage, dropped once scored, on sign-out and after 3 days).
  All registered with payload guards (`isSudokuPayload` checks size 4/6/9, box product, grid
  bounds; malformed items are skipped like unknown types). Registry gains `wide` (slimmer card
  padding for grids) and `quickFlow` (Math Sprint: a correct answer auto-continues after 1.2 s in
  `usePlaySession`). Strings en + fr (`challenge.*`, `play.worth`, `goals.gone`).
- `usePlaySession`: while an answer is pending or queued offline the screen keeps showing that
  item (before, the next item was shown, unlocked but ignored, during "Waiting for a connection").
- `/dev/themes`: Play section has samples for every new type (local scoring, Reset).
- Verified in Chrome (web, mock on :8090 proxying the real backend, session as Mom = modern;
  preview in playful, sleek, classic dark): 4×4 correct (+3 from `points_awarded`), 9×9 wrong
  with solution diff, conflicts + notes, draft survives reload; math correct by keyboard with
  auto-advance, late answer after "Time's up", equivalent fraction `2/8` for `1/4`, ± key,
  reduced-motion text countdown; anagram correct/wrong; missing letter correct/wrong; word
  search by drag (row, reversed column, diagonal), tap-tap reversed word, give up with missed
  bands, auto-submit when all found; malformed item skipped with the "newer app" note; failed ->
  redemption round of math items -> back to active; offline answer queued -> Try again -> scored.
  Phone width: `#root` narrowed to 360/390 px (the Chrome window was maximized, resize had no
  effect): 9×9 cells about 33 px at 360, pad in two rows.
- Not verified: the real B7 backend (not serving these types yet), a phone, word-search drag on
  native inside the ScrollView, sleek dark / modern dark for the new components.
- Contract gaps / questions for B7 (API.md not edited):
  1. Word search: must `start`/`end` follow the word's reading direction, or is a reversed
     placement accepted? The app always sends the reading direction (it matches both ways
     locally and orients the placement).
  2. Anagram/missing letter `response.word`: the app sends lowercase (as in the example);
     accented letters (French) rely on case-insensitive compare being Unicode-aware.
  3. `math_sprint` negative answers: the app offers ± only for `integer`; say whether `decimal`
     / `fraction` answers can be negative. (Resolved in API.md: every format; ± added.)
  4. Do generated items keep their payload stable across `GET /play/sessions/{id}` (needed for
     the persisted drafts, keyed by item id)?
- Mock (`f5-mock.js` in the session scratchpad, not the repo): fake categories 9001-9004,
  generated sudokus (any valid solution accepted), math with rational equivalence, anagrams with
  several valid words, word searches, a malformed sudoku item, 422 for malformed responses,
  second chance / redemption / abandon.
- Checks: typecheck, lint, format:check pass; `npx expo export --platform web` bundles.

### 2026-10-11 - F4 against the real backend, F2b member sign-in without email

- F4 finished against http://localhost:8080 as Mom: the wizard created a race (World Geography,
  weekly from today, target 20, Sam 10, reward); the `POST /goals` body and the returned plan
  match (first weekly period clipped to today, a Sunday); pause shows "This goal is paused";
  delete (tap twice). Played a World Geography session to completion (10/10, celebration); Home
  then showed today 10 / week 20 / total 36 / streak 1 and Pizza Friday 26 -> 36.
- Fixed: after deleting a goal (or saving/removing a member) on a screen opened without history
  (web reload, deep link) `router.back()` was unhandled ("GO_BACK was not handled") and the user
  stayed on the deleted goal. New `goBack(fallback)` in `src/lib/navigation.ts`.
- Fixed: answering didn't invalidate goals, so the Home goal card / goal detail kept old progress
  after playing; `goals` is now invalidated together with stats and leaderboard (only when points
  were awarded).
- F2b built per API.md (B2b): types (`Member.email` / `has_password`, `Policy.email_login_allowed`,
  `SignInCode`, `MemberDevice`, `CodeSignInBody`, `UpdatePasswordBody`, `UpdateMemberBody.email`,
  error `sign_in_code_invalid`); `src/lib/code.ts` (forgiving `normalizeCode`, `groupCode`; join
  uses it too and no longer truncates a pasted `XXXX-XXXX`); hooks `useCodeSignIn`,
  `useIssueSignInCode`, `useMemberDevices` (one request per screen), `useSignOutDevice`,
  `useUpdatePassword`; screens `(auth)/code` (`CodeSignInScreen`) and the `sign-in-code/[id]`
  modal (`SignInCodeScreen`); components `family/components/MemberEmailLogin`,
  `family/components/DevicesList`, `profile/PasswordForm`; Welcome and Login link to the code
  screen; strings en + fr; `formatRelative` / `formatClock` in `src/lib/format.ts`.
- The countdown is measured from when the code arrived, capped at the contract's 15 minutes, so a
  phone with a wrong clock still shows a sensible timer.
- Email field visibility: the Member object has no `email_login_allowed`, so the editor offers the
  field to every non-child member (and to anyone who already has an email); the server's 422 on
  `email` decides. Children without email see "signs in with a code". No age thresholds in the app.
- Verified on web against the real B2b: issue code -> sign in as Sam with `5pkr qg2w` (playful
  Home); wrong code error; New code voids the old one (curl 422); Sam's Profile (no password
  section, My devices, sign out this device -> Welcome). Mom: wrong current password -> field
  error; change password (re-set to `password`); revoke a device from the list (its token -> 401).
  Alex (teen): taken email -> field error; new email -> "No password yet"; Alex (sleek) -> **Set
  password** without current password -> email login works; Mom sees "Password set" -> remove
  email (tap twice) -> `email: null, has_password: false`; admin revokes Alex's device. Server:
  child email -> 422 on `email`; child `PUT /me/password` -> 422; child listing another member's
  devices -> 403. Themes checked: modern, playful, sleek, classic (Mom's theme set to classic via
  the API and reset to Automatic afterwards).
- Backend bugs / contract gaps (not fixed; backend repo / API.md):
  1. `DELETE /goals/{plan}` only sets `is_active: false`; the plan stays in `GET /goals` exactly
     like a paused one, so the app lists a deleted goal under "Paused" and it can be resumed. The
     contract needs a way to tell them apart (omit deleted plans from `GET /goals`, or a
     `deleted_at`).
  2. Admins can't see another member's `email_login_allowed` (Member has no policy flag). The app
     falls back to "non-child -> show, server 422 decides"; a `Member.email_login_allowed` would
     let the editor hide the field for any band the admin disallows.
  3. Transient while B2b was being deployed: `POST /play/sessions/{id}/answers` -> 500
     (`RefreshMemberTotals` listener class missing from the autoloader) and one `DELETE /goals`
     -> 503; both fine a few minutes later.
- Test data left behind: goal "Claude test race" (deleted = inactive), extra device rows for Mom.
- Checks: typecheck and lint pass; format:check passes except `docs/PLAN.md` (not edited here);
  `npx expo export --platform web` bundles.

### 2026-10-12 — Goals against the real backend (partial, time-boxed)

- Contract check vs the 2026-10-11 API.md clarifications: types match. Fixed the goal history row,
  which showed a Reached/Missed badge from the top-level `reached` for competition goals too (now
  cooperation-only; races show the winners). Updated the `winner_member_ids` doc comment. 422 for
  malformed answers and dropped void redemption items need no app change (the app never sends
  malformed responses and only renders the `items` it gets).
- Verified in Chrome against http://localhost:8080 as Mom: Home shows real stats (week 10, today
  1, total 26, streak 1), the Pizza Friday card (team 26/100, reward) and the weekly ranking
  (team 90); goals list; Pizza Friday detail (Oct 5 – Oct 11, i.e. exclusive `ends_at` handled,
  per-member bars, scopes, members, manage actions). Values match the API responses.
- Not done (time box): wizard create/pause/delete and a full play session. No backend bugs seen.

### 2026-10-11 — F4 verified on web, F3 against the live backend

- F4 walked through in Chrome against a goals mock (Node proxy to the live backend that
  implements `/goals*` in memory per API.md and sets `limits.max_active_goals`; kept in the session
  scratchpad, not the repo): Home goal card → list → cooperation detail (reached, confetti in playful,
  history with "Show more" pagination) → race detail → pause (paused section) → wizard (all 7
  steps, sub-topic drill-down, race with per-member target and an excluded member, reward, review,
  create → correct `POST /goals` body) → limit hint on the list and wizard. Themes: modern (Mom),
  playful (Sam token, read-only), sleek (Alex token), classic (Mom with `theme: classic`, reset after).
- Fixed: `PressableScale` put the caller's style on the inner view only, so `flex: 1` was ignored
  and wizard category rows squeezed the checkbox next to the label — layout keys (flex, alignSelf,
  margins, position) now go on the outer `Pressable` (applies app-wide).
- Fixed: period ranges showed the next day (exclusive `ends_at`) and daily periods showed two dates
  — `formatPeriodRange` in `src/features/goals/time.ts`.
- Fixed: paused goals said "Starts soon" / "Starts <past date>" — now "This goal is paused…".
- Fixed: race mode showed "Reward earned", a green bar and "Goal reached!" to every member as soon
  as anyone hit their target — now based on the viewer's own entry (see contract gap).
- Fixed: medals/ribbons for everybody when all members have 0 points.
- Fixed: wizard start dates ("Today" etc.) were device-local; now computed in the family time zone
  (`startDateOptions(now, family.timezone)`), so `starts_on ≥ today` can't fail across zones.
- F3 against the live backend (child token via API, Mom in the UI): create → answers → 409 on a
  repeated answer → failed → redemption (wrong) → `redemption_available: false` → free second
  chance → abandon → 409 on answer after abandon. The UI session starts and scores correctly.
- App-side guard: `useStartSession` defaults `null` counters to 0 (backend bug 1 below).
- Backend bugs / gaps found (not fixed, backend repo):
  1. `POST /play/sessions` returns `"points": null, "mistakes": null, "second_chances_used": null`
     on a new session (expected `0`; `GET` and the answer responses return numbers).
  2. `POST /play/sessions/{id}/answers` with a `choice_id` that is not among the item's choices
     (e.g. `"zz"`) is accepted and counted as a mistake (200, `is_correct: false`); expected 422
     `validation_failed`.
  3. After a failed redemption round (first wrong answer ends it), the remaining redemption items
     stay `answered: false, is_redemption: true` in every later `items` list. The app ignores them
     outside the redemption phase, but the contract should say whether they're voided.
  4. A wrong redemption answer doesn't increase `answered` (stays 3) — confirm that's intended.
  5. `second-chance` while `active` returns 409 `session_not_active` (the contract only lists 403
     `second_chance_unavailable`); fine, but worth documenting.
- Checks: typecheck, lint, format:check pass.

### 2026-10-10 — F4 (in progress)

- Types from API.md "Goals (B6)": `GoalPlan`, `GoalProgress`, `GoalHistoryEntry`, `Paginated`,
  create/update bodies; `Policy.limits.max_active_goals` (`null` = unlimited);
  `goal_limit_reached` error code + message.
- `src/features/goals/`: `hooks.ts` (list, detail seeded from the list, infinite history,
  create/update/delete), `time.ts` (countdown, start-date options), components `GoalCard`,
  `RewardBanner` (wiggling gift in playful, gradient edge in sleek, framed in modern/classic),
  `TeamProgress` (cooperation) and `RaceProgress` (competition; avatars race along lanes in playful).
- Screens/routes: `goals/index` (list; admin "Set a new goal" or upgrade hint when the policy's
  `max_active_goals` is used), `goals/[id]` (current period, countdown, reward, celebration when
  reached, scopes/members, history with winners, admin pause/resume/delete), `goals/new` (wizard:
  name → categories with drill-down → team/race explained → period + start date → target and
  per-member targets → reward → review). Home shows the main active goal (or a create CTA for
  admins); Family tab links to Goals. Non-admins are read-only. Strings in en + fr.
- Weekly leaderboard on Home kept from F3.
- Checks: typecheck, lint, format:check pass; web export bundles. **Not yet exercised in a
  browser** (session ended before the smoke test).
- Note: typed routes (`.expo/types/router.d.ts`) only regenerate when the dev server runs;
  after adding routes run `npm start` once before `npm run typecheck`.

### 2026-10-10 — Contract follow-up (API.md changelog: `default_ui_theme`, senior text scale, redemption items)

- `Member.default_ui_theme` added to `src/api/types.ts`; the member editor's "Automatic" theme
  option now previews that member's own default instead of the admin's.
- Senior `text_scale` default is now 1.0 in the policy; the app only multiplies the member's
  `text_scale` onto the theme's type scale, so classic's larger type no longer compounds (×1.2,
  not ×1.44). No code change needed beyond documenting it in `ThemeProvider`.
- `second-chance` and `redemption` both return all session items; kept merge-by-id (it keeps
  locally recorded answers) and documented it in `src/features/play/api.ts`.
- Checks: typecheck, lint, format:check pass; web export bundles.

### 2026-10-10 — F3

- Play tab (`src/features/play/screens/CategoriesScreen.tsx`) with drill-down `category/[id]`;
  play screen `app/play/[session].tsx` → `PlayScreen.tsx`.
- Session logic in `src/features/play/usePlaySession.ts` (current item, phases, submit, second
  chance / redemption / abandon) and `api.ts` (queries + mutations). `answerQueue.ts`: persisted
  (AsyncStorage) queue for answers that failed with a network error, flushed on reconnect,
  foreground, launch or **Try again**; scored results are delivered back to the play screen.
- Challenge registry: `multiple_choice`, `wisdom_card` with payload guards; invalid or unknown
  items are skipped. `FeedbackPanel`, `Hearts`, `Celebration`/`Confetti`.
- Home tab (`src/features/home/HomeScreen.tsx`): greeting, `GET /me/stats`, week leaderboard snippet.
- Fixed while testing: session hydration flag on web, auth stack initial route (welcome),
  category colors by sibling index, dimmed answer opacity, classic small buttons, sleek backdrop
  now made of plain Views (cheaper than full-screen gradients).
- Contract gaps found (API.md not edited; all resolved by the backend later the same day, see above):
  1. Admins editing another member can't see that member's policy default theme (`Member` has
     no `ui_theme`), so the "Automatic" option previews the admin's own default.
  2. `PATCH /me/accessibility` "needs family": a user without a family can't save appearance;
     the Profile tab says so.
  3. Seniors: classic theme is ×1.2 by design and the policy also defaults `text_scale: 1.2`, so
     a senior gets ×1.44. The app applies both (clamped 0.8–1.6 for the member scale) — decide
     whether one should replace the other.
  4. `second-chance` / `redemption` responses: unclear whether `items` is the full list or only
     new items; the app merges by id, so both work.
  5. Leaderboard has no "current member" flag; the app compares `member_id` with `me.member.id`.
- Checks: typecheck, lint, format:check pass; `npx expo export --platform web` bundles; expo-doctor 21/21.

### 2026-10-10 — F2

- Routes: `(auth)/welcome|login|register|join`, `(onboarding)/create-family`, `member/[id]`,
  `invite` (modal); `(tabs)/family`, `(tabs)/profile`. Guards in `app/_layout.tsx`: update
  required → signed out → no family → app. `GET /me` runs on launch; the policy is read from the
  `me` query (`usePolicy()`), never copied into Zustand.
- Hooks: `src/features/auth/hooks.ts` (me, login, register, join, sign out), `src/features/family/hooks.ts`,
  `src/features/profile/hooks.ts` (optimistic `PATCH /me/accessibility` so the theme switches instantly).
- Join: email/password only sent when the "set an email login" toggle is on; the server decides (422).
- Admin-only UI (invites, member editing) hidden unless `member.role === 'admin'`.
- Sign out (or a 401) clears the token, the query cache and the offline answer queue.

### 2026-10-10 — F0 + F1

- F0: `npm install` (Node 24.14), `.env` from `.env.example` with this PC's Wi-Fi IP, expo-doctor
  21/21. Removed unused template packages `@expo/ui`, `expo-symbols`, `expo-glass-effect`
  (kept `expo-image`, now used for question images).
- Added with `npx expo install`: `@expo-google-fonts/{nunito,space-grotesk,inter,lora,atkinson-hyperlegible}`,
  `expo-linear-gradient`, `expo-haptics`, `expo-clipboard`, `@react-native-async-storage/async-storage`,
  `@react-native-community/netinfo`.
- API: `src/api/types.ts` typed from `../Brainy-Clan-Backend/docs/API.md`; `client.ts` targets
  `/api/v1`, sends `X-App-Version`, throws `ApiError` with contract `code` + 422 `fieldErrors`;
  426 flips the "update required" flag, 401 signs out. `queryKeys.ts`; TanStack Query wired to
  NetInfo + AppState.
- Health: `GET /api/v1/health` replaces `/up`; `min_app_version` newer than `expo.version` → update screen.
- Themes: `src/ui/themes/` (playful, sleek, modern, classic; light + dark tokens, fonts, type
  scale, radius, spacing, touch target, motion, celebration), `ThemeProvider` / `useTheme()`
  (`src/ui/ThemeProvider.tsx`) applying text scale, reduced motion (member + OS). Theme
  selection: member `accessibility.theme` → policy `ui_theme` → `modern`.
- Base components in `src/ui/components/`: Screen, Text, Button, Card, TextField, Avatar,
  ProgressBar, Badge, Chip/Segmented/ToggleRow/Stepper, ListRow, Hearts, Celebration/Confetti,
  Loading/EmptyState/ErrorState, PressableScale, Appear. Old `src/ui/theme.ts` and `Screen.tsx` removed.
- Dev-only `/dev/themes` preview.
- Auth guard routing skeleton in `app/_layout.tsx` (`Stack.Protected`).
- Checks: typecheck, lint, format:check pass; `npx expo export --platform web` bundles.
