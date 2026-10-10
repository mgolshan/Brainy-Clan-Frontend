/**
 * Types for the Brainy Clan API v1.
 * Source of truth: ../Brainy-Clan-Backend/docs/API.md — keep these in sync with it, never guess.
 */

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
  | 'session_not_active'
  | 'second_chance_unavailable'
  | 'app_update_required'
  | 'goal_limit_reached'
  | 'not_found';

/** Error body: `errors` only on 422. */
export interface ApiErrorBody {
  message: string;
  code?: ApiErrorCode | (string & {});
  errors?: Record<string, string[]>;
}

// ---------------------------------------------------------------------------
// Shared objects
// ---------------------------------------------------------------------------

export const AVATAR_KEYS = [
  'fox',
  'owl',
  'panda',
  'lion',
  'koala',
  'penguin',
  'tiger',
  'rabbit',
  'bear',
  'frog',
  'cat',
  'dog',
  'unicorn',
  'dragon',
  'turtle',
  'octopus',
] as const;
export type AvatarKey = (typeof AVATAR_KEYS)[number];

export const THEME_KEYS = ['playful', 'sleek', 'modern', 'classic'] as const;
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
}

export interface Accessibility {
  text_scale: number;
  reduced_motion: boolean;
  calm_timers: boolean;
  /** `null` = use the policy default (`ui_theme`). */
  theme: ThemeKey | null;
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
  status: MemberStatus;
  joined_at: string;
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
  difficulty: { min: number; max: number; default: number };
  second_chance: {
    free_per_day: number;
    free_used_today: number;
    ad_allowed: boolean;
    redemption_allowed: boolean;
  };
  /** `max_active_goals`: `null` = unlimited. */
  limits: { max_members: number; max_categories: number; max_active_goals: number | null };
  accessibility_defaults: Omit<Accessibility, 'theme'>;
  feature_flags: Record<string, unknown>;
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
}

export interface LoginBody extends DeviceInfo {
  email: string;
  password: string;
}

export interface JoinBody extends DeviceInfo {
  code: string;
  email?: string;
  password?: string;
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
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export type CategoryIcon =
  'grid' | 'puzzle' | 'quote' | 'globe' | 'landmark' | 'leaf' | 'calculator' | 'book';

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
  payload: TPayload;
  answered: boolean;
}

export interface SessionPayload {
  session: PlaySession;
  items: SessionItem[];
}

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
  /** Competition: top rank; cooperation: everyone when reached, else []. */
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
