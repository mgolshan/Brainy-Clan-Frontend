# Brainy Clan Frontend — Plan

Expo SDK 57 app (React Native, TypeScript, Expo Router) for iOS, Android and web.
The full product and architecture design is in the design doc linked in `CLAUDE.md`; this file
turns it into ordered app milestones. Track status in `docs/PROGRESS.md`.
Each app milestone depends on the backend milestone named in brackets.

The API contract lives in the backend repo: **`../Brainy-Clan-Backend/docs/API.md`**. Type the
API client from it (`src/api/types.ts`); never guess shapes. Contract changes are made there first.

## Decisions taken during development

### Age-adaptive themes (2026-10-10)

The look adapts to who is holding the phone. The backend policy sends `ui_theme` for the
signed-in member (the app never maps ages to themes itself); a member may pick another theme in
Profile → Appearance (`accessibility.theme`), and accessibility settings (text scale, reduced
motion) apply on top of any theme.

| Theme     | Default for                       | Feel                                                                                                                                         | Typography                                                            | Shape & motion                                                                             |
| --------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `playful` | child (0–12)                      | Bright, multi-color candy palette (sunny yellow, coral, sky, mint, grape), each category its own color, big avatars and emoji, cheerful copy | Rounded (Nunito, heavy weights), larger base size                     | Very round corners (24+), chunky 56px+ touch targets, bouncy springs, confetti on success  |
| `sleek`   | teen (13–17)                      | Elegant and modern, dark-first, deep indigo/near-black surfaces with a violet→cyan gradient accent, restrained use of color                  | Geometric sans (Space Grotesk headings, Inter body), tighter tracking | Medium radius (14), subtle glass-like cards, quick smooth transitions, no childish visuals |
| `modern`  | adult (18–64), signed-out screens | Clean, calm, trustworthy; brand blue with warm neutrals                                                                                      | Inter                                                                 | Radius 12, standard targets, gentle motion                                                 |
| `classic` | senior (65+)                      | Timeless and readable: cream/paper background, navy and deep green, burgundy accent, high contrast (WCAG AAA for body text)                  | Serif headings (Lora), Atkinson Hyperlegible body, base size ×1.2     | Small radius (8), 60px targets, minimal motion, calm timers, clear labels with icons       |

Implementation: `src/ui/themes/` holds one token file per theme (colors light+dark, typography,
radius, spacing, touch target, motion, celebration style); `ThemeProvider` picks the theme from
policy → member override → `modern`, and applies accessibility (`text_scale`, `reduced_motion`,
the OS "reduce motion" setting). Components read tokens only through `useTheme()`.

### Other decisions

- **API format:** `{ data: ... }` envelopes, snake_case, error `code` (see the contract).
- **Avatars** are keys from a fixed set rendered as emoji/illustrations in the app.
- **Goals display (2026-10-11):** cooperation shows the team's `reached` and "Reward earned"; a
  race celebrates only the viewer's own target (`entries[].reached`) and shows the reward without
  "earned", since the top scorer wins when the period closes. Period ranges treat `ends_at` as
  exclusive; the wizard's start dates are computed in the family time zone.
- **API reference (2026-10-11):** besides the contract (`../Brainy-Clan-Backend/docs/API.md`),
  the backend serves full generated OpenAPI docs (Scramble) at `<API>/docs/api` (JSON at
  `/docs/api.json`). Use them to check request/response details; the contract still wins.
- **Social sign-in libraries (2026-10-11):** Google on iOS/Android via
  `react-native-nitro-google-signin` (MIT, Credential Manager on Android, returns an ID token; the
  free `@react-native-google-signin/google-signin` tier sits on Google's legacy Android SDK), Google
  on web and Facebook everywhere via `expo-auth-session` (browser flow, standard access token; no
  Facebook SDK in a family app). Needs an EAS development build (`expo-dev-client`, `eas.json`,
  `app.config.ts` reads client IDs from env); `npm start` stays on Expo Go, `npm run start:dev-client`
  for the dev build. Buttons hide when a provider isn't configured. **Sign in with Apple** is
  required before the iOS release (guideline 4.8) — add an `apple` provider then.
- **Member sign-in without email (2026-10-11, requested by Moe):** children sign in on a new
  device with a one-time code an admin issues from their phone (Family → member → "Sign in on
  another device": big code + countdown, 15 min). Signed-out screens get "I have a sign-in code".
  The member editor lets an admin add/change/remove a member's email login when the policy
  allows (`email_login_allowed`), and lists the member's devices with "Sign out". Profile gets
  "Set password" once the member has an email. Milestone F2b.
- **Social sign-in: Google and Facebook (2026-10-11, requested by Moe):** adults only (welcome,
  sign-in and register screens; never on the invite/child flow). The app signs in natively with
  the provider and sends the token to `POST /auth/social/{provider}` (backend milestone B6b).
  Setup instructions must ship with the feature in the README. See milestone F4b.

- **Moe's answers (2026-10-22):**
  - **iPhone and iPad.** `supportsTablet: true`. On wide screens content sits in a centered column
    (max width from the theme, ~640 for reading screens, ~900 for grids/boards), touch targets and
    font scale unchanged. iPhone stays portrait; iPad supports all orientations (required for iPad
    multitasking) and every screen must work in landscape. Store needs iPad screenshots (13").
  - **Audience:** parents and children under 13 can both find and install the app. Google Play
    target audience 6–8 through 18+ (Families Policy, mixed audience); Apple: not Kids Category,
    Education, 4+. Children never see ads; teen/adult rewarded ads are non-personalized, rating G.
  - **URLs:** website `https://brainyclan.com` (privacy `…/privacy`, terms `…/terms`, support
    `…/support`, account deletion `…/account/delete`), API `https://api.brainyclan.com/api/v1`,
    support email `support@brainyclan.com`.
  - **Sign-in lockout + forgot password** (contract: Auth → Lockout, `POST /auth/password/forgot`):
    the login and code screens show `login_locked` with a live "try again in N min" and offer the
    other ways in (forgot password, sign-in code, social); login gets "Forgot password?".

- **The Clan characters (2026-10-22, Moe):** the mascot becomes a clan of animal characters led by
  Ollie the owl (Ollie stays the app icon). 22 species × 6 variants (kid, teen, mom, dad, grandma,
  grandpa) = 132 avatars, replacing the emoji avatars (keys in the contract). Variants are the same
  character grown up and dressed: teen (headphones/cap/hoodie collar), mom (lashes, blush, lipstick,
  earrings, hair bow or bun), dad (moustache or beard, bow tie), grandma (glasses, grey curls,
  pearls), grandpa (glasses, grey eyebrows/beard, cardigan collar). One original, consistent flat
  style (no imitation of any existing brand; not green like Duolingo's owl), built from a
  parametric generator (`scripts/clan/`) so every species and variant shares proportions, line
  weight and palette rules; rendered with `react-native-svg`. Placeholders until an illustrator
  redraws them; the generator keeps keys/files stable so swapping art is a drop-in. The avatar
  picker groups by variant (Kids, Teens, Parents, Grandparents) and suggests the group matching the
  member's age band first (ordering only, no rule). Characters also appear in celebrations and
  empty states in the `playful` theme, small in others.

- **Theme "worlds" (2026-10-23, Moe: "the theme is too simple and might not be attractive for
  kids and teens"):** themes become worlds that change the whole look, not only colours: a
  background scene (layered SVG, gentle parallax/ambient animation), card style (flat, glass,
  sticker, chunky 3D), button style (press depth), progress bar style (e.g. rocket, vine, neon
  bar), celebration (confetti/stars/bubbles + the member's Clan character reacting), icon accents,
  and a sound pack. Any member picks any world in Profile → Appearance (default by age band from
  the policy, unchanged); accessibility (text scale, reduced motion, calm timers, contrast) always
  wins over a world: reduced motion = static scenes, no parallax.
  - Keys: `playful` ("Candy Land"), `sleek` ("Glass"), `modern`, `classic`, `jungle` ("Jungle
    Adventure"), `space` ("Space Explorers"), `neon` ("Neon Arcade"). Phase 2 adds more worlds
    (Under the Sea, Dino Valley, Sticker Street, Lo-fi Dusk, Calm Nature, Midnight) and unlocks.
  - Shared upgrades in every world: illustrated category cards (each category gets an
    illustration with Clan characters), the member's character reacts to right/wrong answers
    (cheer / encourage), richer buttons and progress, sticker-style badges for kids.
  - **Sound effects** (Moe: yes): short original sounds (correct, wrong, tap, celebration,
    level-up) per world sound pack, generated in-repo (no licensed assets), `expo-audio`; on by
    default for children, off for others (`policy.accessibility_defaults.sound_effects`), member
    toggle `accessibility.sound_effects`; never play when the OS is silent/muted where detectable;
    haptics follow the same toggle.
  - **Unlocks (phase 2, Moe: both):** most worlds unlock with streaks/points (server decides);
    2–3 special worlds are Family-plan only. Phase 1: every world available to everyone.
  - Phase 1 is reviewed by Moe on web (`/dev/themes` and real screens) before phase 2.
  - **Phase 2 (2026-10-23, Moe: "Go for phase 2"):** six more worlds — `sea` ("Under the Sea",
    kids: bubbles, coral, swimming fish, a submarine progress bar), `dino` ("Dino Valley", kids,
    Family plan: volcanoes, ferns, friendly dinos, footprints progress), `sticker` ("Sticker
    Street", teens: bold type, sticker-bombed cards, tape and doodles), `lofi` ("Lo-fi Dusk",
    teens: pastel sunset, city silhouette, gentle rain, cassette progress), `nature` ("Calm
    Nature", everyone: soft greens, hills, birds, calm), `midnight` ("Midnight", everyone, Family
    plan: deep blue, moon, subtle stars, elegant). Unlocks come from the server (`GET /me/worlds`;
    free / points / streak / family_plan, thresholds are server data). Picker: locked worlds show
    a lock + progress ("23 / 50 points", "2 / 3-day streak") or "Family plan" (opens the paywall
    for admins who can buy; others see "Ask a parent"). After a world unlocks, the app shows a
    "New world unlocked!" celebration once (seen state kept locally per member; UI only). If the
    member's stored world is locked again (`theme_unlocked: false`), the app shows the default.

- **Family chat (2026-10-23, Moe):** a "Chat" tab (or Family → Chat; pick what fits the tab bar
  best on phones and iPad) with the family group chat per `docs/API.md` "Family chat": bubbles with
  Clan avatars, emoji keyboard + a quick emoji row, unread badge, optimistic send with `client_id`
  retries (offline-tolerant), delete own message (admins: any), polling while open, retention notice
  ("Messages disappear after 7 days on the free plan" + upsell for admins), admin per-member chat
  switch in the member editor. Message text is **always** rendered with `<Text>` as plain text — never
  HTML, Markdown, WebView or `dangerouslySetInnerHTML`; no link detection. Push `family_chat`
  opens the chat. Styled by the world tokens.
- **Chat report (2026-10-24, Apple guideline 1.2):** non-admins long-press another member's
  message → "Report to a parent" (in-app confirm sheet, `POST /family/chat/messages/{id}/report`);
  admins don't report (they delete) and see a "Reported" tag (Message `reported`) that opens
  Delete / Turn off chat for <name> (member `PATCH chat_enabled`). Push `family_chat_report` opens
  the chat scrolled to the message when it is loaded. Notification toggle `family_chat_report`
  shown for admins only. EAS `development`/`preview` profiles set `EXPO_PUBLIC_API_URL` in
  `eas.json` (never fall back to localhost).

## Working rules

- One milestone at a time. At the end of each, stop, summarize what was built and explain how to test it on the phone.
- Never commit. Moe reviews and commits from PhpStorm.
- Install Expo and React Native packages with `npx expo install` so versions match the SDK.
- All strings through i18n (English and French); the UI never decides age, ads or tier rules itself — it reads the member policy from the API.
- Each milestone is done when `npm run typecheck`, `npm run lint` and `npm run format:check` pass,
  the screens work in Expo Go or the development build, and `PROGRESS.md` is updated.

## Milestones

### F0 — Local environment

- `npm install`, `.env` with the PC's LAN IP, `npm start`, open in Expo Go.
- Home screen shows "Connected" once the backend is running.

### F1 — App foundation [B1]

- API client against `/api/v1` with typed errors; health check via `GET /api/v1/health`.
- Age-adaptive theme system (`playful`, `sleek`, `modern`, `classic`, see Decisions) with light and
  dark mode, custom fonts, and base UI components (Button, Card, TextField, Screen, Avatar,
  ProgressBar) that look right in every theme. A dev-only theme preview screen.
- Error and loading states; minimum app version check with an update prompt.

### F2 — Accounts, family and invites [B2]

- Adult sign-up and sign-in; join with invite code for children (device token in secure storage).
- Admin flow: create family, invite members with nickname and birth year/month, member list, edit difficulty and accessibility.
- Load the member policy on launch and store it.

### F3 — Play loop [B4, B5]

- Challenge registry with Multiple Choice and Wisdom Card components.
- Play session screen: progress toward target, blunder cap, redemption round, second chance.
- Offline-tolerant answer queue.

### F4 — Goals and leaderboard [B6]

- Goal setup wizard: scopes with sub-scopes, mode, period, target, reward.
- Progress, leaderboard (competition) or team total (cooperation), streaks, history.

### F2b — Member sign-in without email [B2b]

- "I have a sign-in code" screen (`POST /auth/code`); admin "Sign in on another device" code screen
  with countdown and share; member editor: email login field and devices list with sign-out;
  Profile: set/change password when `user.email` is set.

### F4b — Social sign-in: Google and Facebook [B6b]

- "Continue with Google" / "Continue with Facebook" on welcome, sign-in and register (adults only),
  branded per the providers' guidelines, styled for every theme.
- Packages (check current SDK-compatible versions with `npx expo install`): Google via
  `@react-native-google-signin/google-signin` (native) or `expo-auth-session`; Facebook via
  `react-native-fbsdk-next` or `expo-auth-session`. Native sign-in needs an **EAS development
  build** (not Expo Go), so this milestone may move the app to a dev build earlier than F6.
- Config plugins in `app.json` (client IDs, URL schemes); web uses the browser redirect flow.
- **README setup guide** (step by step for Moe): where to get each client ID, SHA-1 / key hashes
  for Android, bundle ID for iOS, redirect URIs for web, `.env` keys, and how to test.
- Sign in with Apple is required on iOS once Google/Facebook exist (App Store guideline 4.8).

### F4c — Sign in with Apple [B6c] (requested by Moe, 2026-10-15)

- Google and Facebook are done (F4b). Add "Sign in with Apple" with `expo-apple-authentication`
  (iOS native; Apple's own button component, required styling) on welcome, login, register and
  Profile → Sign-in methods; send the identity token (+ full name on first sign-in, + nonce) to
  `POST /auth/social/apple`. Web: Apple JS redirect flow with the Services ID (optional, after iOS).
  Android: hidden (Google/Facebook cover it).
- Needs an EAS development build on an iPhone and an Apple Developer account
  (`ios.usesAppleSignIn: true` in the app config).
- In-app **account deletion** screen (Profile) once the backend has `DELETE /me` — required by the
  App Store for any app with account creation.
- **README setup guide** for Moe: Apple Developer capability, bundle ID, Services ID for web,
  EAS credentials, how to test on a device.

### F5 — Remaining challenge types [B7]

- Sudoku, Word Puzzles and Math Sprint components (Sudoku and Math Sprint playable offline).

### F6 — Monetization and notifications [B8]

- EAS development build (needed from here on).
- RevenueCat subscriptions and paywall; AdMob rewarded ads for free-tier adults and teens only.
- Push notifications with quiet hours.

### F7 — Release

- App icon, splash, store screenshots and listings.
- EAS Build and Submit; TestFlight and Google Play internal testing with waitlist families; store submission.

### F8 — Pricing, affiliate codes and web checkout [B10] (planned 2026-10-24, Moe)

Decisions and backend scope: `../Brainy-Clan-Backend/docs/PLAN.md` "B10". App scope:

- Paywall with the three plans from the RevenueCat offering (monthly, 6 months, annual
  highlighted with the per-month price and saving; trial badges), founding-families offer when
  the offering has it. Prices always come from the store/offering, never hard-coded. Store
  product IDs: `brainyclan_family_monthly`, `brainyclan_family_6months`,
  `brainyclan_family_annual` (entitlement `family`; backend PLAN B10).
- "Have a code?" field at adult sign-up and on the paywall → `POST /family/referral-code`;
  store offer-code redemption (iOS `presentCodeRedemptionSheet`, Android promo code via Play).
- Web checkout (Paddle) only where store rules allow an in-app link (US storefronts at the time of
  writing; the server tells the app via policy/feature flag, the app never decides by country);
  elsewhere no mention of web prices in the app. A plan bought on the web unlocks the app;
  "Manage subscription" opens the right place (store or Paddle portal).

### Later

- Web version (React Native for Web); web subscriptions go through Paddle (see F8 / B10).

## Open questions

- **Answered by Moe (2026-10-22)** — see "Moe's answers (2026-10-22)" in Decisions.
- **Still waiting for Moe:** Norton certificate (backend dev only); lawyer review of the legal
  drafts; accounts (Apple Developer, Google Play Console, RevenueCat, AdMob + UMP message, Sentry,
  EAS) and a production review account; approve or replace the owl mascot "Ollie".
