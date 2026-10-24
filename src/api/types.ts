/**
 * Types for the Brainy Clan API v1.
 * Source of truth: ../Brainy-Clan-Backend/docs/API.md — keep these in sync with it, never guess.
 */

import { AVATAR_KEYS, type AvatarKey } from '@/ui/avatars/keys';

// ---------------------------------------------------------------------------
// Envelope & errors
// ---------------------------------------------------------------------------

/** Every success body is `{ data: ... }`. */
export interface Envelope<T> {
  data: T;
}

export type ApiErrorCode =
  | 'validation_failed'
  | 'unauthenticated'
  | 'invalid_credentials'
  | 'forbidden'
  | 'member_limit_reached'
  | 'category_not_allowed'
  | 'no_family'
  | 'already_in_family'
  | 'invite_invalid'
  | 'sign_in_code_invalid'
  | 'social_token_invalid'
  | 'social_signup_incomplete'
  | 'social_account_taken'
  | 'last_sign_in_method'
  | 'session_not_active'
  | 'item_already_answered'
  | 'family_owner_cannot_leave'
  | 'second_chance_unavailable'
  | 'ad_reward_pending'
  | 'app_update_required'
  | 'goal_limit_reached'
  | 'rate_limited'
  | 'login_locked'
  | 'world_locked'
  | 'chat_disabled'
  | 'subscription_exists'
  | 'web_checkout_unavailable'
  | 'referral_code_invalid'
  | 'referral_code_locked'
  | 'not_found';

/** Error body: `errors` only on 422. */
export interface ApiErrorBody {
  message: string;
  code?: ApiErrorCode | (string & {});
  errors?: Record<string, string[]>;
  /** `login_locked` (429): seconds until sign-in may be tried again (also the `Retry-After` header). */
  retry_after?: number;
}

// ---------------------------------------------------------------------------
// Shared objects
// ---------------------------------------------------------------------------

/** The Clan avatar keys (22 species × kid/teen/mom/dad/grandma/grandpa), see `@/ui/avatars`. */
export { AVATAR_KEYS, type AvatarKey };

/**
 * Theme "world" keys (contract 2026-10-23): `playful` is shown as "Candy Land", `sleek` as
 * "Glass". Any member may pick any world.
 */
export const THEME_KEYS = [
  'playful',
  'sleek',
  'modern',
  'classic',
  'jungle',
  'space',
  'neon',
  // Phase 2 (contract 2026-10-23): unlocks come from `GET /me/worlds`.
  'sea',
  'dino',
  'sticker',
  'lofi',
  'nature',
  'midnight',
] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];

/** Age band codes come from the backend `age_bands` table; these are the seeded ones. */
export type AgeBand = 'child' | 'teen' | 'adult' | 'senior' | (string & {});

export type Platform = 'ios' | 'android' | 'web';

export interface User {
  id: number;
  display_name: string;
  /** One of AVATAR_KEYS (typed loosely so an unknown key never crashes the app). */
  avatar: string | null;
  /** `null` for children. */
  email: string | null;
  locale: string;
  /** Only for the user themself and family admins. */
  birth_year?: number | null;
  birth_month?: number | null;
}

export type FamilyTier = 'free' | 'family' | (string & {});

export interface Family {
  id: number;
  name: string;
  timezone: string;
  country_code: string;
  tier: FamilyTier;
  owner_user_id: number;
  member_count: number;
  /** Admin view of `GET /family` only (B10): the family's referral code, once set. */
  referral_code?: string | null;
}

export interface Accessibility {
  text_scale: number;
  reduced_motion: boolean;
  calm_timers: boolean;
  /** `null` = use the policy default (`ui_theme`). */
  theme: ThemeKey | null;
  /**
   * Sound effects + haptics: `null` = use the policy default
   * (`accessibility_defaults.sound_effects`). Optional until every backend serves it.
   */
  sound_effects?: boolean | null;
}

export type MemberRole = 'admin' | 'member';
export type MemberStatus = 'active' | (string & {});

export interface Member {
  id: number;
  user_id: number;
  nickname: string;
  avatar: string | null;
  role: MemberRole;
  age_band: AgeBand;
  is_child: boolean;
  /** Only for the member themself and for admins. */
  birth_year?: number | null;
  birth_month?: number | null;
  difficulty_override: number | null;
  accessibility: Accessibility;
  /** Theme the member's age-band policy gives (what "Automatic" resolves to). */
  default_ui_theme: ThemeKey;
  /**
   * `false` when the stored `accessibility.theme` is no longer unlocked for this member (e.g. the
   * family plan ended): the app then shows `default_ui_theme`; the stored choice is kept.
   * `true` when `theme` is null. Optional until every backend serves it (absent = unlocked).
   */
  theme_unlocked?: boolean;
  status: MemberStatus;
  joined_at: string;
  /**
   * Email login (`null` = signs in with codes only). Only present for the member themself and
   * for admins (omitted otherwise).
   */
  email?: string | null;
  /** Whether the email login has a password yet. Same visibility as `email`. */
  has_password?: boolean;
  /**
   * The member's band policy lets an admin give them an email login. Same visibility as
   * `email`.
   */
  email_login_allowed?: boolean;
  /**
   * The member can sign in without the family (email login or a linked Google/Apple/Facebook
   * account); members without one are erased with the family. Same visibility as `email`.
   */
  has_own_login?: boolean;
  /**
   * Family chat on for this member (contract 2026-10-23, default true; an admin turns it off).
   * Optional until every backend serves it (absent = on).
   */
  chat_enabled?: boolean;
}

export interface Policy {
  age_band: AgeBand;
  age: number | null;
  is_child: boolean;
  ui_theme: ThemeKey;
  tier: FamilyTier;
  ads_allowed: boolean;
  purchases_allowed: boolean;
  collect_email: boolean;
  /** An admin may give a member of this band an email login. */
  email_login_allowed: boolean;
  difficulty: { min: number; max: number; default: number };
  second_chance: {
    free_per_day: number;
    free_used_today: number;
    ad_allowed: boolean;
    redemption_allowed: boolean;
  };
  /**
   * How rewarded ads must be requested (AdMob request configuration), from the band policy.
   * Optional until the B9 backend serves it: the app then keeps safe defaults
   * (non-personalized, rating G).
   */
  ad_request?: AdRequestPolicy;
  /** `max_active_goals`: `null` = unlimited. */
  limits: { max_members: number; max_categories: number; max_active_goals: number | null };
  accessibility_defaults: Omit<Accessibility, 'theme'>;
  feature_flags: Record<string, unknown>;
  /** Family chat retention in days (tier settings, server data). Optional until served. */
  chat?: { retention_days: number };
}

/** Policy `ad_request`: AdMob `requestNonPersonalizedAdsOnly`, `tagForUnderAgeOfConsent`, `maxAdContentRating`. */
export interface AdRequestPolicy {
  non_personalized: boolean;
  under_age_of_consent: boolean;
  max_ad_content_rating: 'G' | 'PG' | 'T' | 'MA' | (string & {});
}

// ---------------------------------------------------------------------------
// Legal, consent and privacy (B9)
// ---------------------------------------------------------------------------

export interface LegalDocument {
  /** e.g. `2026-10-16`. */
  version: string;
  /** HTML page (`?lang=fr` for French). */
  url: string;
  /** Short localized "what changed in this version" text for re-acceptance (`?lang=fr`). */
  summary: string | null;
}

/** `GET /legal` (public). */
export interface LegalInfo {
  terms: LegalDocument;
  privacy: LegalDocument;
}

/** `me.legal`: adults whose accepted versions are older than the current ones must re-accept. */
export interface MeLegal {
  /** True for non-child users whose accepted versions differ from the current ones. */
  needs_acceptance: boolean;
  /** Current versions. */
  terms_version: string;
  privacy_version: string;
  /** The user's last accepted versions (`null` = never accepted). */
  accepted_terms_version: string | null;
  accepted_privacy_version: string | null;
}

/** `POST /me/legal-acceptance` (must equal the current versions) → 204. */
export interface LegalAcceptanceBody {
  terms_version: string;
  privacy_version: string;
}

/**
 * `GET /me/export` (any non-child user; children get 403; 1 per hour → 429): the user's own data
 * (right of access). Record contents are server-defined (devices and social accounts without
 * tokens); the app saves the whole payload as a JSON file and never interprets the records.
 */
export interface MeExport {
  exported_at: string;
  user: Record<string, unknown>;
  memberships: Record<string, unknown>[];
  point_entries: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  goals: Record<string, unknown>[];
  consents: Record<string, unknown>[];
  devices: Record<string, unknown>[];
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface Health {
  status: 'ok' | (string & {});
  api_version: string;
  min_app_version: string;
  time: string;
}

// ---------------------------------------------------------------------------
// Auth & me
// ---------------------------------------------------------------------------

export interface DeviceInfo {
  device_name: string;
  platform: Platform;
}

export interface MePayload {
  user: User;
  member: Member | null;
  family: Family | null;
  policy: Policy;
  /** B9: absent on older backends (treated as "nothing to accept"). */
  legal?: MeLegal;
}

export interface AuthPayload extends MePayload {
  token: string;
}

export interface RegisterBody extends DeviceInfo {
  display_name: string;
  email: string;
  password: string;
  birth_year: number;
  birth_month: number;
  locale?: string;
  /** B9: the user agreed to the current Terms and Privacy Policy (422 on `accept_terms` otherwise). */
  accept_terms: true;
}

export interface LoginBody extends DeviceInfo {
  email: string;
  password: string;
}

export interface JoinBody extends DeviceInfo {
  code: string;
  email?: string;
  password?: string;
  /** B9: required when joining as an adult with an email login. */
  accept_terms?: true;
}

/** `POST /auth/code`: sign in with an admin-issued one-time sign-in code. */
export interface CodeSignInBody extends DeviceInfo {
  code: string;
}

/**
 * `POST /auth/password/forgot` (public). Always **202** `{ data: { sent: true } }`, whether or not
 * the email has an account (no account discovery); the reset itself happens on the website page
 * linked from the email.
 */
export interface ForgotPasswordBody {
  email: string;
  locale?: 'en' | 'fr';
}

export interface ForgotPasswordResult {
  sent: true;
}

/** Social sign-in providers (`/auth/social/{provider}`, `/me/social-accounts/{provider}`). */
export type SocialProvider = 'google' | 'facebook' | 'apple';

/**
 * `POST /auth/social/{provider}` (adults only). `token`: Google **ID token** / Facebook **access
 * token** / Apple **identity token**. Birth data only for a first-time sign-up (after 422
 * `social_signup_incomplete`). Apple: `nonce` is the raw nonce whose SHA-256 went to Apple, and
 * `display_name` carries the name Apple shares only on the first authorization.
 */
export interface SocialSignInBody extends DeviceInfo {
  token: string;
  nonce?: string;
  /** Apple only: the sign-in result's authorization code (server revokes Apple tokens later). */
  authorization_code?: string;
  birth_year?: number;
  birth_month?: number;
  display_name?: string;
  locale?: string;
  /** B9: required with the birth data of a first-time sign-up. */
  accept_terms?: true;
}

/** A Google/Facebook/Apple account linked to the signed-in user (`GET /me/social-accounts`). */
export interface SocialAccount {
  provider: SocialProvider;
  email: string | null;
  linked_at: string;
}

/** `PUT /me/password`; `current_password` only when the member already `has_password`. */
/**
 * Why `DELETE /me` is not possible: `family_owner` (owner of a family with other members),
 * `child_account` (below the adult band — a family admin removes them).
 */
export type DeletionBlocker = 'family_owner' | 'child_account' | (string & {});

/** `GET /me/deletion-check`. */
export interface DeletionCheck {
  can_delete: boolean;
  blockers: DeletionBlocker[];
  /** The caller owns the family and is its only member: the family is deleted too. */
  deletes_family: boolean;
  /** Active/grace store subscription: must be cancelled in the store (deletion doesn't). */
  active_subscription: boolean;
  store: SubscriptionStore | null;
}

/** `DELETE /me` body. */
export interface DeleteAccountBody {
  confirm: 'DELETE';
}

/** `DELETE /family` body (owner). `confirm` is the family name. */
export interface DeleteFamilyBody {
  confirm: string;
  delete_my_account?: boolean;
}

export interface UpdatePasswordBody {
  password: string;
  password_confirmation: string;
  current_password?: string;
}

export interface UpdateMeBody {
  display_name?: string;
  avatar?: AvatarKey;
  locale?: string;
}

export interface UpdateAccessibilityBody {
  text_scale?: number;
  reduced_motion?: boolean;
  calm_timers?: boolean;
  theme?: ThemeKey | null;
  sound_effects?: boolean | null;
}

export interface MeStats {
  points_today: number;
  points_week: number;
  points_total: number;
  streak: { current: number; longest: number };
}

// ---------------------------------------------------------------------------
// Family
// ---------------------------------------------------------------------------

export interface CreateFamilyBody {
  name: string;
  timezone: string;
  country_code: string;
}

export interface FamilyPayload {
  family: Family;
  members: Member[];
}

export interface UpdateFamilyBody {
  name?: string;
  timezone?: string;
}

export interface UpdateMemberBody {
  nickname?: string;
  avatar?: AvatarKey;
  difficulty_override?: number | null;
  birth_year?: number;
  birth_month?: number;
  role?: MemberRole;
  accessibility?: Partial<Accessibility>;
  /** Adds, changes or removes (`null`) the member's email login. */
  email?: string | null;
  /** Family chat on/off for the member. */
  chat_enabled?: boolean;
}

/** `POST /family/members/{member}/sign-in-codes` (valid 15 minutes, single use). */
export interface SignInCode {
  code: string;
  member_id: number;
  expires_at: string;
}

/** A signed-in device of a member (`GET /family/members/{member}/devices`). */
export interface MemberDevice {
  id: number;
  name: string;
  platform: Platform | (string & {});
  app_version: string | null;
  last_seen_at: string | null;
  /** The device making this request. */
  is_current: boolean;
}

export interface Invite {
  id: number;
  code: string;
  nickname: string;
  avatar: string | null;
  age_band: AgeBand;
  birth_year: number;
  birth_month: number;
  expires_at: string;
  created_at: string;
}

export interface CreateInviteBody {
  nickname: string;
  birth_year: number;
  birth_month: number;
  avatar?: AvatarKey;
  /**
   * B9: the admin is the child's parent/guardian (or has their permission) and agrees to the
   * privacy policy for the child's data. Required (422 on `parental_consent`) when the birth date
   * falls in a band with `is_child`; the server decides.
   */
  parental_consent?: boolean;
}

/**
 * `GET /family/invites/preview?birth_year=&birth_month=` (admin): what an invite for this birth
 * date means, so the form shows the parental-consent checkbox only when needed.
 */
export interface InvitePreview {
  age_band: AgeBand;
  is_child: boolean;
  parental_consent_required: boolean;
  email_login_allowed: boolean;
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export type CategoryIcon =
  | 'grid'
  | 'puzzle'
  | 'quote'
  | 'globe'
  | 'landmark'
  | 'leaf'
  | 'calculator'
  | 'book'
  | 'bulb'
  | 'language'
  | 'rocket'
  | 'earth'
  | 'palette'
  | 'restaurant'
  | 'football'
  | 'shield'
  | 'sparkles';

export interface Category {
  id: number;
  slug: string;
  name: string;
  /** Short key, see CategoryIcon (typed loosely: unknown keys fall back to a default icon). */
  icon: string | null;
  parent_id: number | null;
  min_age: number | null;
  max_age: number | null;
  is_locked: boolean;
  challenge_types: string[];
  children: Category[];
}

// ---------------------------------------------------------------------------
// Play
// ---------------------------------------------------------------------------

export type SessionStatus = 'active' | 'redemption' | 'failed' | 'completed' | 'abandoned';

export interface PlaySession {
  id: number;
  category_id: number;
  status: SessionStatus;
  target_points: number;
  blunder_cap: number;
  mistakes: number;
  points: number;
  answered: number;
  second_chances_used: number;
  second_chance: {
    free_remaining_today: number;
    ad_available: boolean;
    redemption_available: boolean;
  };
  started_at: string;
  completed_at: string | null;
}

/** `type` is a challenge type key; unknown keys must be skipped by the app. */
export interface SessionItem<TPayload = unknown> {
  id: number;
  position: number;
  type: string;
  is_redemption: boolean;
  /** What a correct answer is worth (1 for most types; bigger puzzles more). */
  points: number;
  payload: TPayload;
  answered: boolean;
}

export interface SessionPayload {
  session: PlaySession;
  items: SessionItem[];
}

/** `GET /play/sessions/current`: the member's most recent unfinished session, or `null`. */
export type CurrentSession = SessionPayload | null;

export interface StartSessionBody {
  category_id: number;
}

export interface AnswerBody {
  session_item_id: number;
  response: unknown;
  time_ms: number;
}

export interface AnswerResult {
  is_correct: boolean;
  correct_response: unknown;
  explanation: string | null;
  points_awarded: number;
  session: PlaySession;
}

export type SecondChanceMethod = 'free' | 'ad';

export interface SecondChanceBody {
  method: SecondChanceMethod;
  reward_ref?: string;
}

// Challenge payloads ---------------------------------------------------------

export interface Choice {
  id: string;
  text: string;
}

export interface MultipleChoicePayload {
  question: string;
  choices: Choice[];
  image_url: string | null;
}

export interface WisdomCardPayload {
  card: { text: string; author: string | null; source: string | null };
  question: string;
  choices: Choice[];
}

export interface ChoiceResponse {
  choice_id: string;
}

/** `sudoku`: 0 = empty cell. `box` = [rows, cols] of one box. */
export interface SudokuPayload {
  size: 4 | 6 | 9;
  box: [number, number];
  grid: number[][];
}

/** `sudoku` response and correct_response (the full grid / the solution). */
export interface SudokuResponse {
  grid: number[][];
}

export type MathAnswerFormat = 'integer' | 'decimal' | 'fraction';

export interface MathSprintPayload {
  question: string;
  answer_format: MathAnswerFormat;
  /** Advisory countdown; `null` = no timer. Answering late still counts. */
  time_limit_ms: number | null;
}

/** `math_sprint` response and correct_response (fractions as "3/4"). */
export interface MathSprintResponse {
  value: string;
}

export interface AnagramPayload {
  variant: 'anagram';
  letters: string[];
  hint: string | null;
}

export interface MissingLetterPayload {
  variant: 'missing_letter';
  /** `_` = one missing letter (maybe several). */
  pattern: string;
  hint: string | null;
}

export interface WordSearchPayload {
  variant: 'word_search';
  grid: string[][];
  words: string[];
}

export type WordPuzzlePayload = AnagramPayload | MissingLetterPayload | WordSearchPayload;

/** [row, col], zero-based. */
export type GridCell = [number, number];

export interface WordPlacement {
  word: string;
  start: GridCell;
  end: GridCell;
}

/** `anagram` / `missing_letter` response and correct_response. */
export interface WordResponse {
  word: string;
}

/** `word_search` response and correct_response (all placements). */
export interface WordSearchResponse {
  found: WordPlacement[];
}

/**
 * `memory_match` (brain game): `cards` are the face-down positions (row-major, zero-based), each
 * face a Clan kid avatar key appearing exactly twice; 3–10 pairs.
 */
export interface MemoryMatchPayload {
  cols: number;
  cards: string[];
  max_attempts: number;
}

/** `memory_match` response: every pair of positions turned over, in order. */
export interface MemoryMatchResponse {
  attempts: [number, number][];
}

/** `memory_match` correct_response. */
export interface MemoryMatchCorrectResponse {
  attempts: null;
  cards: string[];
}

/**
 * `pattern_sequence` (brain game): 3–6 pads (Clan kid avatar keys), the sequence of pad indexes
 * to repeat (length 3–9) and how long each step is shown.
 */
export interface PatternSequencePayload {
  pads: string[];
  sequence: number[];
  show_ms: number;
}

/** `pattern_sequence` response and correct_response (the sequence). */
export interface PatternSequenceResponse {
  input: number[];
}

/** `nonogram` (brain games): clue runs per row (top→bottom) and column (left→right). */
export interface NonogramPayload {
  rows: number;
  cols: number;
  row_clues: number[][];
  col_clues: number[][];
}

/** `nonogram` response: 1 = filled, 0 = empty (row-major). */
export interface NonogramResponse {
  grid: number[][];
}

/** `nonogram` correct_response: the solution and its localized picture name. */
export interface NonogramCorrectResponse {
  grid: number[][];
  title: string | null;
}

/** Named palette colors of the spot-the-difference art. */
export type SpotColor =
  'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'brown' | 'white';

/** One object of a spot-the-difference picture; `x`/`y`/`size` are fractions of the width. */
export interface SpotObject {
  id: string;
  /** Clan kid avatar key or a prop key (tree, sun, cloud, …). */
  kind: string;
  x: number;
  y: number;
  size: number;
  color: SpotColor;
  flip: boolean;
}

export type SpotChangeKind = 'missing' | 'color' | 'size' | 'flip';

/** A change applied to the right picture (`value`: color key, new size, true, or null). */
export interface SpotChange {
  id: string;
  object_id: string;
  change: SpotChangeKind;
  value: SpotColor | number | boolean | null;
}

export interface SpotDifferencePayload {
  /** Picture width / height. */
  aspect: number;
  objects: SpotObject[];
  changes: SpotChange[];
  max_misses: number;
}

/** `spot_difference` response: taps normalized 0–1 within the tapped picture, [x, y]. */
export interface SpotDifferenceResponse {
  taps: [number, number][];
}

// ---------------------------------------------------------------------------
// Goals (B6)
// ---------------------------------------------------------------------------

export type GoalMode = 'competition' | 'cooperation';
export type GoalPeriodType = 'daily' | 'weekly' | 'monthly';
export type GoalPeriodStatus = 'open' | 'closed';

export interface GoalScope {
  category_id: number;
  name: string;
}

export interface GoalPlanMember {
  member_id: number;
  nickname: string;
  avatar: string | null;
  target_override: number | null;
}

export interface GoalProgressEntry {
  member_id: number;
  nickname: string;
  avatar: string | null;
  points: number;
  target: number;
  reached: boolean;
  rank: number;
}

export interface GoalProgress {
  period_id: number;
  starts_at: string;
  ends_at: string;
  status: GoalPeriodStatus;
  team_total: number;
  target_points: number;
  reached: boolean;
  /** Sorted by rank (ties share a rank). */
  entries: GoalProgressEntry[];
}

export interface GoalPlan {
  id: number;
  name: string;
  mode: GoalMode;
  period_type: GoalPeriodType;
  target_points: number;
  reward_text: string | null;
  /** Date only, `YYYY-MM-DD`. */
  starts_on: string;
  ends_on: string | null;
  is_active: boolean;
  scopes: GoalScope[];
  members: GoalPlanMember[];
  current_period: GoalProgress | null;
}

export interface GoalHistoryEntry extends GoalProgress {
  /**
   * Competition: everyone tied at rank 1 with more than 0 points (empty when nobody scored);
   * cooperation: everyone when reached, else [].
   */
  winner_member_ids: number[];
}

export interface PageMeta {
  current_page: number;
  last_page: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface CreateGoalBody {
  name: string;
  mode: GoalMode;
  period_type: GoalPeriodType;
  target_points: number;
  reward_text?: string;
  starts_on: string;
  ends_on?: string;
  category_ids: number[];
  members?: { member_id: number; target_override?: number }[];
}

export type UpdateGoalBody = Partial<CreateGoalBody> & { is_active?: boolean };

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export type LeaderboardPeriod = 'today' | 'week' | 'month' | 'all';

export interface LeaderboardEntry {
  member_id: number;
  nickname: string;
  avatar: string | null;
  points: number;
  rank: number;
}

export interface Leaderboard {
  period: LeaderboardPeriod;
  starts_at: string | null;
  ends_at: string | null;
  team_total: number;
  entries: LeaderboardEntry[];
}

// ---------------------------------------------------------------------------
// Billing and notifications (B8)
// ---------------------------------------------------------------------------

export type SubscriptionStatus = 'active' | 'grace' | 'expired' | 'none' | (string & {});
/** `paddle`: bought on the website (Paddle web checkout, B10). */
export type SubscriptionStore = 'app_store' | 'play_store' | 'stripe' | 'paddle' | (string & {});

/** `GET /family/subscription` (admin). The tier comes only from RevenueCat webhooks. */
export interface Subscription {
  tier: FamilyTier;
  status: SubscriptionStatus;
  store: SubscriptionStore | null;
  product_id: string | null;
  expires_at: string | null;
  will_renew: boolean;
  /** Passed to `Purchases.logIn()` (RevenueCat app user id, `family-{id}`). */
  revenuecat_app_user_id: string;
}

/**
 * `POST /family/subscription/manage-link` (admin, B10): the Paddle customer portal for `paddle`
 * plans, the store's subscription page for store plans.
 */
export interface ManageLink {
  url: string;
}

/**
 * `GET /family/web-checkout/availability?storefront=USA` (admin, B10). `url` is set only when
 * `link_allowed`; the app shows no web prices or links otherwise.
 */
export interface WebCheckoutAvailability {
  link_allowed: boolean;
  url: string | null;
}

/** `POST /family/referral-code` body (admin, B10): letters/digits/dash, ≤ 20, any case. */
export interface ReferralCodeBody {
  code: string;
}

/** `POST /family/referral-code` → the attribution now stored for the family. */
export interface ReferralCodeResult {
  code: string;
  source: 'code' | 'link' | 'offer_code' | 'web_checkout' | (string & {});
}

export type NotificationType =
  | 'goal_reached'
  | 'period_closed'
  | 'family_activity'
  | 'daily_reminder'
  | 'family_chat'
  /** Admins only (2026-10-24): a member reported a chat message. Default on. */
  | 'family_chat_report';

/** `GET /me/notification-preferences`. Times are `HH:MM` in the family timezone. */
export interface NotificationPreferences {
  /** Keys newer than the backend may be missing (the app then shows the default). */
  types: Partial<Record<NotificationType, boolean>>;
  quiet_from: string | null;
  quiet_to: string | null;
  reminder_time: string | null;
}

/** `PATCH /me/notification-preferences`: same shape, all optional. */
export interface UpdateNotificationPreferencesBody {
  types?: Partial<Record<NotificationType, boolean>>;
  quiet_from?: string | null;
  quiet_to?: string | null;
  reminder_time?: string | null;
}

/** `PUT /me/push-token`. */
export interface PushTokenBody {
  token: string;
  platform: string;
}

// ---------------------------------------------------------------------------
// Worlds and unlocks (contract 2026-10-23, phase 2)
// ---------------------------------------------------------------------------

/** Points / streak unlocks carry the server's threshold and the member's current value. */
export interface WorldProgressUnlock {
  type: 'points' | 'streak';
  required: number;
  progress: number;
}

/**
 * How a world unlocks: `free` (always), `points` (lifetime points ≥ required), `streak`
 * (longest streak days ≥ required), `family_plan` (paid Family plan). Thresholds are server data.
 */
export type WorldUnlock = { type: 'free' } | WorldProgressUnlock | { type: 'family_plan' };

export type WorldUnlockType = WorldUnlock['type'];

/**
 * One entry of `GET /me/worlds` / `GET /family/members/{member}/worlds` (display order). `key`
 * stays a plain string: the server may know worlds this app version doesn't (skipped).
 */
export interface WorldCatalogEntry {
  key: string;
  unlock: WorldUnlock;
  unlocked: boolean;
}

// ---------------------------------------------------------------------------
// Family chat (contract 2026-10-23)
// ---------------------------------------------------------------------------

/**
 * One family chat message. `body` is plain UTF-8 text (any emoji) and `null` when `deleted`
 * ("Message deleted"). It must only ever be rendered as plain text (`<Text>`): never as HTML or
 * Markdown, never in a WebView, never with link detection. `member_id` is `null` for an author
 * who left the family ("Former member").
 */
export interface ChatMessage {
  id: number;
  member_id: number | null;
  nickname: string | null;
  avatar: string | null;
  body: string | null;
  deleted: boolean;
  client_id: string | null;
  created_at: string;
  /**
   * `true` when a member reported this message (2026-10-24). Only admins ever see `true`; other
   * members always get `false`. Optional until every backend serves it (absent = not reported).
   */
  reported?: boolean;
}

export interface ChatMessagesMeta {
  has_more: boolean;
  retention_days: number;
  last_read_id: number | null;
  unread: number;
}

/**
 * `GET /family/chat/messages?before=&after=&limit=` (limit ≤ 100): newest first for `before` /
 * no cursor, oldest first for `after` (polling).
 */
export interface ChatMessagesPage {
  data: ChatMessage[];
  meta: ChatMessagesMeta;
}

/**
 * `POST /family/chat/messages` → 201 (200 when this `client_id` was already stored: re-sends
 * never duplicate). `body`: 1–1000 characters after trimming.
 */
export interface SendChatMessageBody {
  body: string;
  client_id: string;
}

/** `POST /family/chat/read` (only moves forward) → 204. */
export interface ChatReadBody {
  last_read_id: number;
}

/** `GET /family/chat/unread`. */
export interface ChatUnread {
  unread: number;
}
