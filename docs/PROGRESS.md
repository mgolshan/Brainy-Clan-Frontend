# Brainy Clan Frontend — Progress

Update this file at the end of every work session: milestone status, what changed, and what is next.
Milestones are defined in `docs/PLAN.md`.

## Status

| Milestone | Status | Notes |
| --- | --- | --- |
| Scaffold | Done | Expo SDK 57, Expo Router, tabs and join placeholders, core packages, CLAUDE.md |
| F0 Local environment | Not started | `npm install` not run on Windows yet |
| F1 App foundation | Not started | Waits for B1 |
| F2 Accounts, family and invites | Not started | Waits for B2 |
| F3 Play loop | Not started | Waits for B4 and B5 |
| F4 Goals and leaderboard | Not started | Waits for B6 |
| F5 Remaining challenge types | Not started | Waits for B7 |
| F6 Monetization and notifications | Not started | Waits for B8 |
| F7 Release | Not started | |

## Next up

1. Install Node 22 LTS, run `npm install`, create `.env` from `.env.example` with the PC's LAN IP, run `npm start`.
2. Commit the pending changes (`.gitignore`, `CLAUDE.md`, `docs/`).
3. Start F1 once backend B1 is done.

## Known issues and notes

- Not yet run on a phone; typecheck, lint, Prettier and a web export passed when scaffolded.
- Daily development runs natively on Windows (`npm start`); Docker on Windows often misses file changes from the F: drive.
- Token storage falls back to `localStorage` on web (not secure); fine until the web version is built.
- Unused template packages (`@expo/ui`, `expo-symbols`, `expo-glass-effect`, `expo-image`) are still in `package.json`.
- `.claude/settings.json` enables Expo's official Claude plugin (from the Expo template).

## Log

### 2026-10-10
- Created the app with Expo SDK 57: tabs (Home, Play, Family, Profile), a join-with-invite placeholder, API client, TanStack Query, Zustand session store with secure storage, i18n (en, fr), theme tokens, challenge registry types, Docker files.
- Initial commit `d32c895`. Added the design doc link to `CLAUDE.md`, plus `docs/PLAN.md` and `docs/PROGRESS.md` (not committed).
