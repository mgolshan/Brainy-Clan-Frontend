import type { TFunction } from 'i18next';

import { ApiError } from '@/api/client';

/**
 * User-facing message for any error. Contract error codes map to translated strings;
 * validation errors fall back to the first field message from the server (already localized
 * by Laravel), then to the server `message`.
 */
export function errorMessage(error: unknown, t: TFunction): string {
  if (!(error instanceof ApiError)) return t('errors.unknown');
  switch (error.code) {
    case 'network_error':
      return t('errors.network');
    case 'timeout':
      return t('errors.timeout');
    case 'unauthenticated':
      return t('errors.unauthenticated');
    case 'invalid_credentials':
      return t('errors.invalidCredentials');
    case 'forbidden':
      return t('errors.forbidden');
    case 'member_limit_reached':
      return t('errors.memberLimitReached');
    case 'category_not_allowed':
      return t('errors.categoryNotAllowed');
    case 'no_family':
      return t('errors.noFamily');
    case 'already_in_family':
      return t('errors.alreadyInFamily');
    case 'invite_invalid':
      return t('errors.inviteInvalid');
    case 'sign_in_code_invalid':
      return t('errors.signInCodeInvalid');
    case 'social_token_invalid':
      return t('errors.socialTokenInvalid');
    case 'social_signup_incomplete':
      return t('errors.socialSignupIncomplete');
    case 'social_account_taken':
      return t('errors.socialAccountTaken');
    case 'last_sign_in_method':
      return t('errors.lastSignInMethod');
    case 'session_not_active':
      return t('errors.sessionNotActive');
    case 'second_chance_unavailable':
      return t('errors.secondChanceUnavailable');
    case 'ad_reward_pending':
      return t('errors.adRewardPending');
    case 'app_update_required':
      return t('errors.updateRequired');
    case 'goal_limit_reached':
      return t('errors.goalLimitReached');
    case 'world_locked':
      return t('errors.worldLocked');
    case 'family_owner_cannot_leave':
      return t('errors.familyOwnerCannotLeave');
    case 'not_found':
      return t('errors.notFound');
    case 'rate_limited':
      return t('errors.rateLimited');
    case 'chat_disabled':
      return t('chat.disabledTitle');
    case 'login_locked':
      // Screens with a sign-in form show a live countdown instead (`useLockout`).
      return t('errors.loginLocked');
    case 'validation_failed': {
      const first = Object.values(error.fieldErrors)[0]?.[0];
      return first ?? error.message ?? t('errors.validation');
    }
    default:
      if (error.status === 429) return t('errors.rateLimited');
      if (error.status >= 500) return t('errors.server');
      return error.message || t('errors.unknown');
  }
}
