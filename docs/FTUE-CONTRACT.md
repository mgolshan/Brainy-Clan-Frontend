# FTUE contract (B12 step 4) — onboarding progress

Written by the app agent on 2026-11-21 from backend `docs/PLAN.md` "FTUE plan (step 4)". The
backend builds exactly this; the app (`src/features/onboarding/`) codes against it. When this file
and the plan disagree, this file wins (it fixes what the plan left open). Copy it into `API.md`
("Onboarding (FTUE)") when the backend is built and add a changelog line there.

## Endpoints

All three: auth (Bearer), **no family needed** (a user without a family gets the same shape; the
family-derived steps are then `null`). Progress is stored **per user** (so a second device never
repeats it). Normal rate limit (120/min per token). Envelope `{ "data": … }` as everywhere.

| Method + path                 | Body                | Success                                                           |
| ----------------------------- | ------------------- | ----------------------------------------------------------------- |
| `GET /me/onboarding`          | –                   | 200 `{ "data": Onboarding }`                                      |
| `POST /me/onboarding/{step}`  | none (empty / `{}`) | 200 `{ "data": Onboarding }` (the whole object, after the change) |
| `POST /me/onboarding/dismiss` | none                | 200 `{ "data": Onboarding }`                                      |

`dismiss` is a reserved path segment, never a step key.

### Onboarding object

```json
{
  "steps": {
    "welcome": "2026-11-21T10:00:00Z",
    "create_family": "2026-11-21T09:58:12Z",
    "pick_world": null,
    "add_member": null,
    "co_admin": null,
    "first_game": null,
    "first_goal": null,
    "say_hi": null,
    "welcome_family": null,
    "avatar_world": null,
    "family_goal": null,
    "classroom_welcome": null,
    "class_details": null,
    "roster": null,
    "code_cards": null,
    "chat_mode": null,
    "end_of_year": null,
    "code_sign_in": null,
    "tip_play": null,
    "tip_goals": null,
    "tip_chat": null,
    "upgrade_family": null,
    "upgrade_big_clan": null,
    "upgrade_classroom": null
  },
  "dismissed_at": null
}
```

- `steps`: **every** key of the table below, always present, value = ISO 8601 UTC `done_at` or
  `null`. (The app treats a missing key as `null`, so adding keys later is safe.)
- `dismissed_at`: when the user hid the "Getting started" checklist (`null` = shown). Dismissing
  hides the checklist and the welcome sheet only; tips and the upgrade sheet keep working.
- The server does **not** pick the flow: the app chooses it from `GET /me` (tier + role + age band,
  see "Flows"). The server only stores and derives step times.

### Step keys

Two kinds:

- **manual** — set only by `POST /me/onboarding/{step}` (the app calls it when the user finishes
  that step or sees that tip/sheet).
- **derived** — the server computes it on every `GET` (and on the POST responses) from real data.
  The first time a derived step is true the server **stores** `done_at` (= now) and it stays done
  from then on, even if the data changes later (e.g. students removed by "new year"). A derived
  key can't be POSTed (422).

| key                                                         | kind    | done when (derived) / meaning (manual)                                                                                                         |
| ----------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `welcome`                                                   | manual  | owner saw the 3 welcome cards (play together, family goals, safe chat)                                                                         |
| `create_family`                                             | derived | the user has an active family membership                                                                                                       |
| `pick_world`                                                | manual  | owner opened "pick your world"                                                                                                                 |
| `add_member`                                                | derived | the user's family has ≥ 2 active members **or** ≥ 1 pending (unused, unexpired) invite                                                         |
| `co_admin`                                                  | derived | the user's family has ≥ 2 active members with role `admin`                                                                                     |
| `first_game`                                                | derived | the user's member has ≥ 1 play session with status `completed` or `failed`                                                                     |
| `first_goal`                                                | derived | the user's family has ≥ 1 goal plan (any; soft-deleted ones count too)                                                                         |
| `say_hi`                                                    | derived | the user's member has posted ≥ 1 chat message (deleted ones count too)                                                                         |
| `welcome_family`                                            | manual  | invited member saw "Welcome to {family}"                                                                                                       |
| `avatar_world`                                              | manual  | member / student opened "avatar and world"                                                                                                     |
| `family_goal`                                               | manual  | member / student opened "here's your family (class) goal"                                                                                      |
| `classroom_welcome`                                         | manual  | teacher saw the Classroom welcome                                                                                                              |
| `class_details`                                             | derived | the family is on `classroom` and an active admin accepted the **current** classroom consent version (`GET /legal` `classroom_consent.version`) |
| `roster`                                                    | derived | classroom `students_count` ≥ 1                                                                                                                 |
| `code_cards`                                                | derived | classroom `codes_issued_at` is not null                                                                                                        |
| `chat_mode`                                                 | manual  | teacher chose a chat mode in the FTUE sheet                                                                                                    |
| `end_of_year`                                               | manual  | teacher read "how the end of the year works"                                                                                                   |
| `code_sign_in`                                              | derived | the user has an active family membership (same rule as `create_family`; label differs)                                                         |
| `tip_play` / `tip_goals` / `tip_chat`                       | manual  | one-time coach mark on Play / Goals / Chat was shown                                                                                           |
| `upgrade_family` / `upgrade_big_clan` / `upgrade_classroom` | manual  | the one-time "what's new for you" sheet for that tier was shown                                                                                |

Derivations must be a fixed number of queries per request (no per-step N+1); the derived checks
are cheap `exists` queries on the user's current family / member.

### Errors

| case                                                    | status | code                                   |
| ------------------------------------------------------- | ------ | -------------------------------------- |
| no / bad token                                          | 401    | `unauthenticated`                      |
| `{step}` is not a key of the table, or is a derived key | 422    | `validation_failed` with `errors.step` |
| too many requests                                       | 429    | `rate_limited`                         |

- `POST /me/onboarding/{step}` is **idempotent**: a step already done keeps its first `done_at`
  (still 200 with the object).
- `POST /me/onboarding/dismiss` is idempotent too (keeps the first `dismissed_at`).
- **Older servers** answer 404 on all three routes: the app then hides the checklist, coach marks,
  welcome and upgrade sheets (nothing else changes). No new error codes.

## Flows (chosen by the app from `GET /me`)

| flow      | who (from `/me`)                                                                                                               | ordered steps (required)                                                                                                      | optional                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `owner`   | `user.id == family.owner_user_id` and `policy.tier` ≠ `classroom` (free, family, big_clan, unknown)                            | `welcome`, `create_family`, `pick_world`, `add_member`, `co_admin` (**big_clan only**), `first_game`, `first_goal`, `say_hi`¹ | –                                |
| `member`  | any other member, tier ≠ `classroom` (child / teen / adult / senior; kids get fewer words and emoji, seniors a text-size hint) | `welcome_family`, `avatar_world`, `first_game`, `family_goal`                                                                 | –                                |
| `teacher` | `policy.tier == classroom` and `member.role == admin` (teacher and co-teacher)                                                 | `classroom_welcome`, `class_details`, `roster`, `code_cards`, `chat_mode`, `first_goal`, `end_of_year`                        | `co_admin` (invite a co-teacher) |
| `student` | `policy.tier == classroom` and `member.role == member`                                                                         | `code_sign_in`, `avatar_world`, `first_game`, `family_goal`, `say_hi`²                                                        | –                                |

¹ only while the chat tab is visible for the member (chat mode not `off`, `chat_enabled` not false).
² only when the effective chat mode is `normal` and the member's chat is enabled.

- The welcome sheet = the flow's first manual step (`welcome` / `welcome_family` /
  `classroom_welcome`); students have none. When the user closes it on a paid tier the app also
  marks `upgrade_{tier}` (the welcome already covers the plan).
- "What's new for you" sheet: family admins only, when `policy.tier` is paid, the flow's welcome
  is done (or the checklist dismissed) and no `upgrade_*` key of the same or a higher-ranked tier
  is done (`family` < `big_clan` < `classroom`), so a downgrade never shows it.
- Celebration: when every required step of the flow is done, the card celebrates; closing it
  calls `POST /me/onboarding/dismiss`.
- Measurement: the server's own timestamps are the counters (no third-party SDK).
