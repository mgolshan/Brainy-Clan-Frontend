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

### F5 — Remaining challenge types [B7]

- Sudoku, Word Puzzles and Math Sprint components (Sudoku and Math Sprint playable offline).

### F6 — Monetization and notifications [B8]

- EAS development build (needed from here on).
- RevenueCat subscriptions and paywall; AdMob rewarded ads for free-tier adults and teens only.
- Push notifications with quiet hours.

### F7 — Release

- App icon, splash, store screenshots and listings.
- EAS Build and Submit; TestFlight and Google Play internal testing with waitlist families; store submission.

### Later

- Web version (React Native for Web) with web subscriptions through RevenueCat web billing.

## Open questions

- Whether teens on the free tier see rewarded ads.
- Logo and mascot (the theme palettes above are decided; a mascot would fit the `playful` theme).
