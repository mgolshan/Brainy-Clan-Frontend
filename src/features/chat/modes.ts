import { ApiError } from '@/api/client';
import type { ChatMessage, ChatMode, Family, FamilyTier, MePayload, Policy } from '@/api/types';

/**
 * Chat safety (B12 step 2), pure logic: the family's effective chat mode (Classroom tool), what
 * the composer shows for it, whether the Chat tab is listed, the profanity-filter note and the
 * 403s the server sends when the mode changed mid-session. The server decides everything; the
 * app only renders it (fields absent on older servers: filter on, mode `normal`, modes not allowed).
 */

/** The three known modes; anything else from the server reads as `normal`. */
export type KnownChatMode = 'normal' | 'announcements' | 'off';

/** Known mode for a raw value (absent or unknown = `normal`). */
export function normalizeChatMode(mode: ChatMode | null | undefined): KnownChatMode {
  if (mode === 'announcements') return 'announcements';
  return mode === 'off' ? 'off' : 'normal';
}

/** The family's effective mode, from `me` (the server already sends the effective value). */
export function effectiveChatMode(me: MePayload | undefined): KnownChatMode {
  return normalizeChatMode(me?.family?.chat_mode);
}

/** Profanity filter on (absent = on: safety is the default). */
export function chatFilterOn(family: Pick<Family, 'chat_filter'> | null | undefined): boolean {
  return family?.chat_filter !== false;
}

/** The admin may pick a chat mode (`policy.chat.modes_allowed`, Classroom only; absent = no). */
export function chatModesAllowed(policy: Policy | undefined): boolean {
  return policy?.chat?.modes_allowed === true;
}

/**
 * What sits under the chat for this member:
 * - `composer`: everyone can post (normal mode);
 * - `announcer`: an admin in announcements mode (composer + a small "Announcements mode" chip);
 * - `readOnly`: a non-admin in announcements mode (a calm banner instead of the composer);
 * - `off`: chat is off for everyone (no chat at all).
 */
export type ComposerState = 'composer' | 'announcer' | 'readOnly' | 'off';

export function composerState(mode: KnownChatMode, isAdmin: boolean): ComposerState {
  if (mode === 'off') return 'off';
  if (mode === 'announcements') return isAdmin ? 'announcer' : 'readOnly';
  return 'composer';
}

/** The member may send messages now (also gates sending the outbox). */
export function canPostInMode(mode: KnownChatMode, isAdmin: boolean): boolean {
  const state = composerState(mode, isAdmin);
  return state === 'composer' || state === 'announcer';
}

/** The Chat tab is listed unless the family turned chat off. */
export function chatTabVisible(me: MePayload | undefined): boolean {
  return effectiveChatMode(me) !== 'off';
}

/** Copy says "teachers" in a Classroom, "admins" elsewhere. */
export function isClassroom(tier: FamilyTier | null | undefined): boolean {
  return tier === 'classroom';
}

/** "Some words were hidden": only for the author of a masked message (others just see ★). */
export function showFilteredNote(message: ChatMessage, ownMemberId: number | null): boolean {
  return (
    message.filtered === true &&
    !message.deleted &&
    ownMemberId !== null &&
    message.member_id === ownMemberId
  );
}

/** The chat-mode refusals (403) a chat call may get when the mode changed mid-session. */
export type ChatModeErrorCode = 'chat_read_only' | 'chat_off';

export function chatModeErrorCode(error: unknown): ChatModeErrorCode | null {
  if (!(error instanceof ApiError)) return null;
  if (error.code === 'chat_read_only') return 'chat_read_only';
  return error.code === 'chat_off' ? 'chat_off' : null;
}

/**
 * `me` with the mode a refusal reveals (`chat_off` → `off`, `chat_read_only` → `announcements`),
 * so the screen switches at once while `me` is re-read. Same object when nothing changes.
 */
export function withChatModeFromError(
  me: MePayload | undefined,
  code: ChatModeErrorCode,
): MePayload | undefined {
  if (!me?.family) return me;
  const mode: KnownChatMode = code === 'chat_off' ? 'off' : 'announcements';
  if (me.family.chat_mode === mode) return me;
  return { ...me, family: { ...me.family, chat_mode: mode } };
}

/** Status line of a "Not sent" bubble, by the refusal's error code. */
export type FailedStatusKey =
  | 'chat.failed'
  | 'chat.failedRateLimited'
  | 'chat.disabledTitle'
  | 'chat.failedReadOnly'
  | 'chat.failedReadOnlyClassroom'
  | 'chat.failedOff';

export function failedStatusKey(
  errorCode: string | null | undefined,
  classroom: boolean,
): FailedStatusKey {
  switch (errorCode) {
    case 'rate_limited':
      return 'chat.failedRateLimited';
    case 'chat_disabled':
      return 'chat.disabledTitle';
    case 'chat_read_only':
      return classroom ? 'chat.failedReadOnlyClassroom' : 'chat.failedReadOnly';
    case 'chat_off':
      return 'chat.failedOff';
    default:
      return 'chat.failed';
  }
}

/** One radio card of the admin's chat mode picker (family settings). */
export interface ChatModeOption {
  mode: KnownChatMode;
  titleKey:
    'family.chatSafety.normal' | 'family.chatSafety.announcements' | 'family.chatSafety.off';
  bodyKey:
    | 'family.chatSafety.normalBody'
    | 'family.chatSafety.announcementsBody'
    | 'family.chatSafety.announcementsBodyClassroom'
    | 'family.chatSafety.offBody';
  icon: 'chatbubbles-outline' | 'megaphone-outline' | 'notifications-off-outline';
}

/** The picker's cards in order ("teachers / students" wording in a Classroom). */
export function chatModeOptions(classroom: boolean): ChatModeOption[] {
  return [
    {
      mode: 'normal',
      titleKey: 'family.chatSafety.normal',
      bodyKey: 'family.chatSafety.normalBody',
      icon: 'chatbubbles-outline',
    },
    {
      mode: 'announcements',
      titleKey: 'family.chatSafety.announcements',
      bodyKey: classroom
        ? 'family.chatSafety.announcementsBodyClassroom'
        : 'family.chatSafety.announcementsBody',
      icon: 'megaphone-outline',
    },
    {
      mode: 'off',
      titleKey: 'family.chatSafety.off',
      bodyKey: 'family.chatSafety.offBody',
      icon: 'notifications-off-outline',
    },
  ];
}
