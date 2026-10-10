# Brainy Clan Frontend — Plan

Expo SDK 57 app (React Native, TypeScript, Expo Router) for iOS, Android and web.
The full product and architecture design is in the design doc linked in `CLAUDE.md`; this file
turns it into ordered app milestones. Track status in `docs/PROGRESS.md`.
Each app milestone depends on the backend milestone named in brackets.

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
- Theme, typography, base UI components (Button, Card, TextField, Screen) with light and dark mode.
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
- Visual identity (colors, logo, mascot) before F1's UI kit is finalized.
