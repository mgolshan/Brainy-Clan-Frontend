import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifyManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { api } from '@/api/client';
import { classroomAgeMissed, preselectedTier } from '@/features/billing/plans';
import { useCreateFamily } from '@/features/family/hooks';
import {
  CLASSROOM_PAYWALL_HREF,
  homeIntentAction,
  parseIntent,
  resolveIntent,
  signupHref,
  signupIntentAfterFamilyCreated,
  startSignup,
  useSignupIntent,
} from '@/features/onboarding/signupIntent';
import { ageFromBirth } from '@/lib/age';

jest.mock('@/api/client', () => {
  const actual = jest.requireActual<typeof import('@/api/client')>('@/api/client');
  return { ...actual, api: { ...actual.api, post: jest.fn() } };
});
jest.mock('@/features/billing/referral', () => ({ applyPendingReferral: () => Promise.resolve() }));
jest.mock('@/features/worlds/hooks', () => ({ recoverFromWorldLocked: () => false }));
jest.mock('@/features/auth/hooks', () => ({ useIsAdmin: () => true }));

notifyManager.setScheduler((cb) => cb());

const KEY = 'brainyclan.signup-intent';
const state = () => useSignupIntent.getState();

beforeEach(async () => {
  state().clear();
  await AsyncStorage.clear();
});

describe('parseIntent / resolveIntent', () => {
  it('reads a route param (string or array), ignoring junk', () => {
    expect(parseIntent('classroom')).toBe('classroom');
    expect(parseIntent(['family', 'classroom'])).toBe('family');
    expect(parseIntent('teacher')).toBeNull();
    expect(parseIntent(undefined)).toBeNull();
    expect(parseIntent(3)).toBeNull();
  });

  it('prefers the route param, then the stored intent, then family', () => {
    expect(resolveIntent('classroom', 'family')).toBe('classroom');
    expect(resolveIntent(undefined, 'classroom')).toBe('classroom');
    expect(resolveIntent('junk', null)).toBe('family');
  });
});

describe('routing with intent', () => {
  it('sends both welcome doors to the same register screen with the intent', () => {
    expect(signupHref('family')).toEqual({ pathname: '/register', params: { intent: 'family' } });
    expect(signupHref('classroom')).toEqual({
      pathname: '/register',
      params: { intent: 'classroom' },
    });
  });

  it('opens the plan picker with Classroom preselected', () => {
    expect(CLASSROOM_PAYWALL_HREF).toEqual({
      pathname: '/family-plan',
      params: { plan: 'classroom' },
    });
    expect(preselectedTier('classroom')).toBe('classroom');
    expect(preselectedTier(['big_clan'])).toBe('big_clan');
    expect(preselectedTier('free')).toBeNull();
    expect(preselectedTier(undefined)).toBeNull();
  });
});

describe('persistence', () => {
  it('stores the chosen intent on the device', async () => {
    state().choose('classroom');
    await new Promise((r) => setTimeout(r, 0));
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}');
    expect(saved.state).toEqual({ intent: 'classroom', stage: 'signup' });
  });

  it('survives a restart (rehydrates from storage)', async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ state: { intent: 'classroom', stage: 'finish' }, version: 0 }),
    );
    await useSignupIntent.persist.rehydrate();
    expect(state().intent).toBe('classroom');
    expect(state().stage).toBe('finish');
  });

  it('startSignup keeps (or switches) the intent for register / social sign-up', () => {
    startSignup('classroom');
    expect(state()).toMatchObject({ intent: 'classroom', stage: 'signup' });
    startSignup('family');
    expect(state().intent).toBe('family');
  });
});

describe('after the family is created', () => {
  it('moves the classroom intent on to the paywall', () => {
    state().choose('classroom');
    signupIntentAfterFamilyCreated();
    expect(state()).toMatchObject({ intent: 'classroom', stage: 'paywall' });
  });

  it('clears a family intent (used up)', () => {
    state().choose('family');
    signupIntentAfterFamilyCreated();
    expect(state()).toMatchObject({ intent: null, stage: 'signup' });
  });

  it('the create-family mutation does it before `me` changes', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { id: 5, name: 'Class 4B' } });
    state().choose('classroom');
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
    });
    const hook: { create?: ReturnType<typeof useCreateFamily> } = {};
    function Probe() {
      hook.create = useCreateFamily();
      return null;
    }
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <QueryClientProvider client={client}>
          <Probe />
        </QueryClientProvider>,
      );
    });
    await act(async () => {
      await hook.create!.mutateAsync({ name: 'Class 4B', timezone: 'UTC', country_code: 'CA' });
    });
    expect(state().stage).toBe('paywall');
    act(() => tree.unmount());
    client.clear();
  });
});

describe('homeIntentAction', () => {
  const ctx = { tier: 'free' as const, isAdmin: true, canBuy: true };

  it('does nothing without an intent or before the membership loaded', () => {
    expect(homeIntentAction({ intent: null, stage: 'signup' }, ctx)).toBe('none');
    expect(
      homeIntentAction({ intent: 'classroom', stage: 'paywall' }, { ...ctx, isAdmin: null }),
    ).toBe('none');
  });

  it('opens the paywall once, then shows the card', () => {
    expect(homeIntentAction({ intent: 'classroom', stage: 'paywall' }, ctx)).toBe('openPaywall');
    expect(homeIntentAction({ intent: 'classroom', stage: 'finish' }, ctx)).toBe('showCard');
  });

  it('shows the card straight away where the build cannot sell', () => {
    expect(
      homeIntentAction({ intent: 'classroom', stage: 'paywall' }, { ...ctx, canBuy: false }),
    ).toBe('showCard');
  });

  it('clears when there is nothing left to do', () => {
    // Already on Classroom.
    expect(
      homeIntentAction({ intent: 'classroom', stage: 'finish' }, { ...ctx, tier: 'classroom' }),
    ).toBe('clear');
    // Signed in to an existing family (the intent never reached create-family).
    expect(homeIntentAction({ intent: 'classroom', stage: 'signup' }, ctx)).toBe('clear');
    // Family intent, or not an admin.
    expect(homeIntentAction({ intent: 'family', stage: 'paywall' }, ctx)).toBe('clear');
    expect(
      homeIntentAction({ intent: 'classroom', stage: 'finish' }, { ...ctx, isAdmin: false }),
    ).toBe('clear');
  });
});

describe('age gate with the teacher intent', () => {
  const now = new Date(2026, 10, 21);

  it('explains up front when the birth date is under 18', () => {
    expect(classroomAgeMissed(ageFromBirth(2009, 12, now))).toBe(18); // 16
    expect(classroomAgeMissed(ageFromBirth(2008, 12, now))).toBe(18); // 17, birthday next month
  });

  it('lets 18+ and unknown ages through (the server decides)', () => {
    expect(classroomAgeMissed(ageFromBirth(2008, 11, now))).toBeNull(); // 18 this month
    expect(classroomAgeMissed(null)).toBeNull();
  });

  it('uses the served `min_owner_age` when there is one', () => {
    const served = [{ id: 'classroom', min_owner_age: 21 }] as never;
    expect(classroomAgeMissed(19, served)).toBe(21);
    const none = [{ id: 'classroom', min_owner_age: null }] as never;
    expect(classroomAgeMissed(16, none)).toBeNull();
  });
});
