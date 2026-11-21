import type { Family, MePayload, Member, Onboarding, OnboardingStepKey, Policy } from '@/api/types';
import { isGoalTemplate, NEW_GOAL_FORM, templateForm } from '@/features/goals/goalForm';
import {
  checklist,
  checklistVisible,
  copyVariant,
  DERIVED_STEPS,
  flowSteps,
  isDerivedStep,
  resolveFlow,
  resolveFlowSteps,
  selectFlow,
  shouldShowWelcome,
  stepAction,
  stepLabelId,
  tipVisible,
  upgradeSheetTier,
  welcomeMarks,
  welcomeStep,
  type FlowKey,
} from '@/features/onboarding/flows';
import en from '@/i18n/locales/en.json';

const OWNER_USER = 1;

interface MeOpts {
  tier?: string;
  role?: 'admin' | 'member';
  owner?: boolean;
  band?: string;
  chatMode?: Family['chat_mode'];
  chatEnabled?: boolean;
  family?: boolean;
  member?: boolean;
}

function me(o: MeOpts = {}): MePayload {
  const tier = o.tier ?? 'free';
  const userId = o.owner === false ? 2 : OWNER_USER;
  const family: Family = {
    id: 1,
    name: 'The Clan',
    timezone: 'America/Toronto',
    country_code: 'CA',
    tier,
    owner_user_id: OWNER_USER,
    member_count: 3,
    chat_mode: o.chatMode ?? 'normal',
  };
  const member = {
    id: 5,
    user_id: userId,
    nickname: 'Sam',
    avatar: 'fox',
    role: o.role ?? (o.owner === false ? 'member' : 'admin'),
    age_band: o.band ?? 'adult',
    chat_enabled: o.chatEnabled ?? true,
  } as unknown as Member;
  return {
    user: { id: userId, display_name: 'Sam', avatar: 'fox', email: null, locale: 'en' },
    member: o.member === false ? null : member,
    family: o.family === false ? null : family,
    policy: {
      tier,
      age_band: o.band ?? 'adult',
      limits: { max_members: 12, max_categories: 100, max_active_goals: null, max_adults: null },
    } as unknown as Policy,
  };
}

const onb = (done: OnboardingStepKey[] = [], dismissed: string | null = null): Onboarding => ({
  steps: Object.fromEntries(done.map((k) => [k, '2026-11-21T10:00:00Z'])),
  dismissed_at: dismissed,
});

const keys = (m: MePayload) => flowSteps(m).map((s) => s.key);

describe('selectFlow', () => {
  it('picks the flow from tier + role + ownership', () => {
    expect(selectFlow(me({ tier: 'free' }))).toBe('owner');
    expect(selectFlow(me({ tier: 'family' }))).toBe('owner');
    expect(selectFlow(me({ tier: 'big_clan' }))).toBe('owner');
    expect(selectFlow(me({ tier: 'family', owner: false }))).toBe('member');
    // A co-admin who joined by invite keeps the member flow.
    expect(selectFlow(me({ tier: 'family', owner: false, role: 'admin' }))).toBe('member');
    expect(selectFlow(me({ tier: 'classroom', role: 'admin' }))).toBe('teacher');
    expect(selectFlow(me({ tier: 'classroom', owner: false, role: 'admin' }))).toBe('teacher');
    expect(selectFlow(me({ tier: 'classroom', owner: false, role: 'member' }))).toBe('student');
  });

  it('treats an unknown tier like a family plan', () => {
    expect(selectFlow(me({ tier: 'mega' }))).toBe('owner');
  });

  it('has no flow without a family or a member', () => {
    expect(selectFlow(undefined)).toBeNull();
    expect(selectFlow(me({ family: false }))).toBeNull();
    expect(selectFlow(me({ member: false }))).toBeNull();
  });
});

describe('server flow and steps (preferred over the app derivation)', () => {
  const server = (o: Partial<Onboarding>): Onboarding => ({ ...onb(), ...o });

  it("prefers the server's flow", () => {
    expect(resolveFlow(server({ flow: 'member' }), me())).toBe('member');
    expect(resolveFlow(server({ flow: 'teacher' }), me({ tier: 'free' }))).toBe('teacher');
  });

  it('falls back to the app derivation on older servers', () => {
    expect(resolveFlow(onb(), me())).toBe('owner');
    expect(resolveFlow(null, me({ owner: false }))).toBe('member');
    expect(resolveFlow(undefined, undefined)).toBeNull();
  });

  it('gives a user without a family the owner flow when the server says so', () => {
    const noFamily = me({ family: false, member: false });
    expect(selectFlow(noFamily)).toBeNull();
    expect(resolveFlow(server({ flow: 'owner' }), noFamily)).toBe('owner');
  });

  it("uses the server's required then optional steps", () => {
    const steps = resolveFlowSteps(
      server({
        flow: 'teacher',
        required_steps: ['roster', 'first_goal'],
        optional_steps: ['co_admin'],
      }),
      me(),
    );
    expect(steps).toEqual([
      { key: 'roster', required: true },
      { key: 'first_goal', required: true },
      { key: 'co_admin', required: false },
    ]);
  });

  it('derives the steps for the server flow when it sends no lists', () => {
    const steps = resolveFlowSteps(server({ flow: 'member' }), me()).map((s) => s.key);
    expect(steps).toEqual(['welcome_family', 'avatar_world', 'first_game', 'family_goal']);
  });

  it('derives everything on older servers', () => {
    expect(resolveFlowSteps(onb(), me())).toEqual(flowSteps(me()));
  });

  it('counts only required server steps in the checklist', () => {
    const o = server({
      flow: 'owner',
      required_steps: ['welcome', 'first_game'],
      optional_steps: ['co_admin'],
      steps: { welcome: 'x', co_admin: 'y' },
    });
    const c = checklist(o, resolveFlowSteps(o, me()));
    expect([c.done, c.total, c.next, c.complete]).toEqual([1, 2, 'first_game', false]);
  });

  it("follows the server's flow for the upgrade sheet's welcome", () => {
    // The app would say "owner"; the server says "member", so `welcome_family` counts.
    expect(
      upgradeSheetTier(
        server({ flow: 'member', steps: { welcome_family: 'x' } }),
        me({ tier: 'family' }),
      ),
    ).toBe('family');
  });
});

describe('copyVariant', () => {
  it('follows the server age band', () => {
    expect(copyVariant({ age_band: 'child' })).toBe('kid');
    expect(copyVariant({ age_band: 'senior' })).toBe('senior');
    expect(copyVariant({ age_band: 'teen' })).toBe('standard');
    expect(copyVariant({ age_band: 'adult' })).toBe('standard');
    expect(copyVariant(undefined)).toBe('standard');
  });
});

describe('flowSteps (order)', () => {
  it('owner (free / family)', () => {
    const expected = [
      'welcome',
      'create_family',
      'pick_world',
      'add_member',
      'first_game',
      'first_goal',
      'say_hi',
    ];
    expect(keys(me({ tier: 'free' }))).toEqual(expected);
    expect(keys(me({ tier: 'family' }))).toEqual(expected);
  });

  it('Big Clan adds the co-admin step after the first member', () => {
    expect(keys(me({ tier: 'big_clan' }))).toEqual([
      'welcome',
      'create_family',
      'pick_world',
      'add_member',
      'co_admin',
      'first_game',
      'first_goal',
      'say_hi',
    ]);
  });

  it('owner without chat (chat turned off for them) has no chat step', () => {
    expect(keys(me({ chatEnabled: false }))).not.toContain('say_hi');
  });

  it('invited member (any age band)', () => {
    for (const band of ['child', 'teen', 'adult', 'senior']) {
      expect(keys(me({ tier: 'family', owner: false, band }))).toEqual([
        'welcome_family',
        'avatar_world',
        'first_game',
        'family_goal',
      ]);
    }
  });

  it('teacher, with the co-teacher as the only optional step', () => {
    const steps = flowSteps(me({ tier: 'classroom', role: 'admin' }));
    expect(steps.map((s) => s.key)).toEqual([
      'classroom_welcome',
      'class_details',
      'roster',
      'code_cards',
      'chat_mode',
      'first_goal',
      'end_of_year',
      'co_admin',
    ]);
    expect(steps.filter((s) => !s.required).map((s) => s.key)).toEqual(['co_admin']);
  });

  it('student: chat step only in normal mode', () => {
    const student = (chatMode: Family['chat_mode']) =>
      keys(me({ tier: 'classroom', owner: false, role: 'member', chatMode }));
    expect(student('normal')).toEqual([
      'code_sign_in',
      'avatar_world',
      'first_game',
      'family_goal',
      'say_hi',
    ]);
    expect(student('announcements')).not.toContain('say_hi');
    expect(student('off')).not.toContain('say_hi');
  });
});

describe('stepAction (deep links)', () => {
  const flows: FlowKey[] = ['owner', 'member', 'teacher', 'student'];

  it('maps every flow step to a screen, a sheet or nothing', () => {
    expect(stepAction('welcome', 'owner')).toEqual({ kind: 'sheet', sheet: 'welcome' });
    expect(stepAction('welcome_family', 'member')).toEqual({ kind: 'sheet', sheet: 'welcome' });
    expect(stepAction('classroom_welcome', 'teacher')).toEqual({ kind: 'sheet', sheet: 'welcome' });
    expect(stepAction('chat_mode', 'teacher')).toEqual({ kind: 'sheet', sheet: 'chatMode' });
    expect(stepAction('end_of_year', 'teacher')).toEqual({ kind: 'sheet', sheet: 'endOfYear' });
    expect(stepAction('pick_world', 'owner')).toEqual({
      kind: 'route',
      href: '/profile',
      mark: true,
    });
    expect(stepAction('avatar_world', 'student')).toEqual({
      kind: 'route',
      href: '/profile',
      mark: true,
    });
    expect(stepAction('family_goal', 'member')).toEqual({
      kind: 'route',
      href: '/goals',
      mark: true,
    });
    expect(stepAction('add_member', 'owner')).toEqual({
      kind: 'route',
      href: '/invite',
      mark: false,
    });
    expect(stepAction('co_admin', 'teacher')).toEqual({
      kind: 'route',
      href: '/invite',
      mark: false,
    });
    expect(stepAction('first_game', 'student')).toEqual({
      kind: 'route',
      href: '/play',
      mark: false,
    });
    expect(stepAction('say_hi', 'owner')).toEqual({ kind: 'route', href: '/chat', mark: false });
    expect(stepAction('class_details', 'teacher')).toMatchObject({ href: '/classroom/consent' });
    expect(stepAction('roster', 'teacher')).toMatchObject({ href: '/classroom/roster' });
    expect(stepAction('code_cards', 'teacher')).toMatchObject({ href: '/classroom/codes' });
    expect(stepAction('code_sign_in', 'student')).toEqual({ kind: 'none' });
  });

  it('opens the first goal as a template (Pizza Friday for families, a class goal for teachers)', () => {
    expect(stepAction('first_goal', 'owner')).toEqual({
      kind: 'route',
      href: { pathname: '/goals/new', params: { template: 'pizza' } },
      mark: false,
    });
    expect(stepAction('first_goal', 'teacher')).toMatchObject({
      href: { pathname: '/goals/new', params: { template: 'class' } },
    });
  });

  it('never posts a derived step (the server ticks those)', () => {
    for (const flow of flows) {
      for (const key of DERIVED_STEPS) {
        const action = stepAction(key, flow);
        expect(action.kind === 'route' && action.mark).toBe(false);
      }
    }
    expect(isDerivedStep('first_game')).toBe(true);
    expect(isDerivedStep('pick_world')).toBe(false);
  });

  it('has a label (title + hint) in en for every step of every flow and variant', () => {
    const all = [
      me({ tier: 'big_clan' }),
      me({ tier: 'family', owner: false }),
      me({ tier: 'classroom', role: 'admin' }),
      me({ tier: 'classroom', owner: false, role: 'member' }),
    ];
    const steps = en.onboarding.steps as Record<string, string>;
    const hints = en.onboarding.hints as Record<string, string>;
    for (const m of all) {
      const flow = selectFlow(m)!;
      for (const variant of ['kid', 'standard', 'senior'] as const) {
        for (const s of flowSteps(m)) {
          const id = stepLabelId(s.key, flow, variant);
          expect(steps[id]).toBeTruthy();
          expect(hints[id]).toBeTruthy();
        }
      }
    }
  });

  it('words shared steps per flow and gives kids the short labels', () => {
    expect(stepLabelId('first_goal', 'owner', 'standard')).toBe('firstGoal');
    expect(stepLabelId('first_goal', 'teacher', 'standard')).toBe('classGoal');
    expect(stepLabelId('co_admin', 'teacher', 'standard')).toBe('coTeacher');
    expect(stepLabelId('family_goal', 'student', 'standard')).toBe('classGoalSeen');
    expect(stepLabelId('family_goal', 'member', 'kid')).toBe('familyGoalKid');
    expect(stepLabelId('avatar_world', 'student', 'kid')).toBe('avatarKid');
    // Owners are adults (18+): never the kid copy.
    expect(stepLabelId('first_game', 'owner', 'kid')).toBe('firstGame');
  });
});

describe('checklist', () => {
  it('counts required steps and picks the next open one', () => {
    const steps = flowSteps(me({ tier: 'family' }));
    const list = checklist(onb(['welcome', 'create_family', 'first_game']), steps);
    expect(list.total).toBe(7);
    expect(list.done).toBe(3);
    expect(list.next).toBe('pick_world');
    expect(list.complete).toBe(false);
  });

  it('locks roster until the consent and code cards until the roster', () => {
    const steps = flowSteps(me({ tier: 'classroom', role: 'admin' }));
    let list = checklist(onb(['classroom_welcome']), steps);
    const locked = (l: typeof list) => l.items.filter((i) => i.locked).map((i) => i.key);
    expect(locked(list)).toEqual(['roster', 'code_cards']);
    expect(list.next).toBe('class_details');
    list = checklist(onb(['classroom_welcome', 'class_details']), steps);
    expect(locked(list)).toEqual(['code_cards']);
    expect(list.next).toBe('roster');
  });

  it('is complete without the optional step, and the next one is then the optional one', () => {
    const steps = flowSteps(me({ tier: 'classroom', role: 'admin' }));
    const required = steps.filter((s) => s.required).map((s) => s.key);
    const list = checklist(onb(required), steps);
    expect(list.complete).toBe(true);
    expect(list.done).toBe(list.total);
    expect(list.next).toBe('co_admin');
  });

  it('reflects server-derived steps as they come (nothing posted by the app)', () => {
    const steps = flowSteps(
      me({ tier: 'classroom', owner: false, role: 'member', chatMode: 'off' }),
    );
    const list = checklist(onb(['code_sign_in', 'first_game']), steps);
    expect(list.items.filter((i) => i.done).map((i) => i.key)).toEqual([
      'code_sign_in',
      'first_game',
    ]);
    expect(list.next).toBe('avatar_world');
  });

  it('ignores unknown step keys from a newer server', () => {
    const o = {
      steps: { welcome: 'x', brand_new: 'y' },
      dismissed_at: null,
    } as unknown as Onboarding;
    expect(checklist(o, flowSteps(me())).done).toBe(1);
  });
});

describe('visibility', () => {
  it('hides the checklist on an older server, without a flow, or once dismissed', () => {
    expect(checklistVisible(null, 'owner')).toBe(false);
    expect(checklistVisible(undefined, 'owner')).toBe(false);
    expect(checklistVisible(onb(), null)).toBe(false);
    expect(checklistVisible(onb([], '2026-11-21T10:00:00Z'), 'owner')).toBe(false);
    expect(checklistVisible(onb(), 'owner')).toBe(true);
  });

  it('opens the welcome once, never for students', () => {
    expect(welcomeStep('student')).toBeNull();
    expect(shouldShowWelcome(onb(), 'owner')).toBe(true);
    expect(shouldShowWelcome(onb(['welcome']), 'owner')).toBe(false);
    expect(shouldShowWelcome(onb(), 'student')).toBe(false);
    expect(shouldShowWelcome(onb([], 'x'), 'member')).toBe(false);
    expect(shouldShowWelcome(null, 'teacher')).toBe(false);
  });

  it('closing the welcome on a paid plan also covers its "what\'s new"', () => {
    expect(welcomeMarks('owner', 'free')).toEqual(['welcome']);
    expect(welcomeMarks('owner', 'big_clan')).toEqual(['welcome', 'upgrade_big_clan']);
    expect(welcomeMarks('teacher', 'classroom')).toEqual([
      'classroom_welcome',
      'upgrade_classroom',
    ]);
    expect(welcomeMarks('student', 'classroom')).toEqual([]);
    expect(welcomeMarks('owner', 'mega')).toEqual(['welcome']);
  });

  it('coach marks show once (server state + this run)', () => {
    expect(tipVisible(onb(), 'tip_play', false)).toBe(true);
    expect(tipVisible(onb(['tip_play']), 'tip_play', false)).toBe(false);
    expect(tipVisible(onb(), 'tip_play', true)).toBe(false);
    expect(tipVisible(null, 'tip_goals', false)).toBe(false);
    // Tips keep working after the checklist is dismissed.
    expect(tipVisible(onb([], 'x'), 'tip_chat', false)).toBe(true);
  });
});

describe('upgradeSheetTier', () => {
  it('shows once for admins after the welcome, on a paid tier', () => {
    expect(upgradeSheetTier(onb(['welcome']), me({ tier: 'family' }))).toBe('family');
    expect(upgradeSheetTier(onb(['welcome']), me({ tier: 'big_clan' }))).toBe('big_clan');
    expect(
      upgradeSheetTier(onb(['welcome', 'upgrade_big_clan']), me({ tier: 'big_clan' })),
    ).toBeNull();
  });

  it('waits for the welcome (or a dismissed checklist)', () => {
    expect(upgradeSheetTier(onb(), me({ tier: 'family' }))).toBeNull();
    expect(upgradeSheetTier(onb([], 'x'), me({ tier: 'family' }))).toBe('family');
  });

  it('never for members, free or unknown tiers, or older servers', () => {
    expect(
      upgradeSheetTier(onb(['welcome_family']), me({ tier: 'family', owner: false })),
    ).toBeNull();
    expect(upgradeSheetTier(onb(['welcome']), me({ tier: 'free' }))).toBeNull();
    expect(upgradeSheetTier(onb(['welcome']), me({ tier: 'mega' }))).toBeNull();
    expect(upgradeSheetTier(null, me({ tier: 'family' }))).toBeNull();
  });

  it('shows again on a real upgrade but never on a downgrade', () => {
    expect(upgradeSheetTier(onb(['welcome', 'upgrade_family']), me({ tier: 'big_clan' }))).toBe(
      'big_clan',
    );
    expect(
      upgradeSheetTier(onb(['welcome', 'upgrade_big_clan']), me({ tier: 'family' })),
    ).toBeNull();
  });

  it('covers a co-admin (member flow) once their welcome is done', () => {
    const coAdmin = me({ tier: 'big_clan', owner: false, role: 'admin' });
    expect(upgradeSheetTier(onb(), coAdmin)).toBeNull();
    expect(upgradeSheetTier(onb(['welcome_family']), coAdmin)).toBe('big_clan');
  });
});

describe('goal templates', () => {
  it('pre-fills a whole-family, all-categories goal', () => {
    const form = templateForm('pizza', { name: 'Pizza Friday', reward: '🍕 Pizza night' });
    expect(form).toEqual({
      ...NEW_GOAL_FORM,
      name: 'Pizza Friday',
      reward: '🍕 Pizza night',
      allCategories: true,
      everyone: true,
      categoryIds: [],
      target: '100',
    });
    expect(templateForm('class', { name: 'Class challenge', reward: '' }).target).toBe('200');
  });

  it('accepts only known template params', () => {
    expect(isGoalTemplate('pizza')).toBe(true);
    expect(isGoalTemplate('class')).toBe(true);
    expect(isGoalTemplate('party')).toBe(false);
    expect(isGoalTemplate(undefined)).toBe(false);
  });
});
