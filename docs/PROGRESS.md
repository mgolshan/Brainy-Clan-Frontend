# Brainy Clan Frontend — Progress

Update this file at the end of every work session: milestone status, what changed, and what is next.
Milestones are defined in `docs/PLAN.md`.

## Status

| Milestone                         | Status                                                                                  | Notes                                                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Scaffold                          | Done                                                                                    | Expo SDK 57, Expo Router, tabs and join placeholders, core packages, CLAUDE.md                                           |
| F0 Local environment              | Done                                                                                    | `npm install` on Node 24, `.env` with LAN IP `192.168.2.23`, expo-doctor 21/21                                           |
| F1 App foundation                 | Done                                                                                    | `/api/v1` client + typed errors, health, version gate, age-adaptive themes, base UI, `/dev/themes`                       |
| F2 Accounts, family and invites   | Done (sign-in + Family tab checked on web against the mock; real login payload matches) | Welcome/register/login/join, create family, Family + Profile tabs, member editor, invites                                |
| F3 Play loop                      | Done (played against the live backend on web; backend bugs listed in the log)           | Categories + drill-down, play screen, MC + Wisdom Card, feedback, lives, second chances, redemption, offline queue, Home |
| F4 Goals and leaderboard          | Done on web against a goals mock (B6 not live yet)                                      | Goals list, detail (team bar / race, countdown, history), 7-step wizard, Home + Family entry points                      |
| F5 Remaining challenge types      | Not started                                                                             | Waits for B7                                                                                                             |
| F6 Monetization and notifications | Not started                                                                             | Waits for B8                                                                                                             |
| F7 Release                        | Not started                                                                             |                                                                                                                          |

## Next up

1. Finish the F4 run against the real backend (B6 Goals is live): wizard create (competition,
   real POST /goals) → pause → delete, and one session to completion as Mom (stats update).
   Home, goals list and Pizza Friday detail are already verified (2026-10-12 log).
2. Run F2–F4 on a phone against the real backend.
3. Then F5 (remaining challenge types, waits for B7).

## Known issues and notes

- Not yet run on a phone. Checked on web (Chrome) only (F4 also, on 2026-10-11, with a goals mock): theme preview, welcome/login/register,
  and the full play loop (login → Home → Play → session → wrong answers → failed → redemption →
  completed + confetti → offline queue) against a throwaway mock of API.md.
- Real backend on 2026-10-11: `/me/stats`, `/family/leaderboard` and `/play/*` are live (play
  bugs in the 2026-10-11 log); `/goals` still 404. Requests now take ~0.5–1 s; the very first
  request after a container start can take ~15 s (client timeout 15 s, health 10 s). A transient
  nginx 502 happened once while the backend was being worked on.
- Web needs CORS on the backend for `http://localhost:8081`.
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

## Log

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
