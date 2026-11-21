import { ApiError } from '@/api/client';
import type { ChatMessage, Family, MePayload, Policy } from '@/api/types';
import en from '@/i18n/locales/en.json';
import {
  canPostInMode,
  chatFilterOn,
  chatModeErrorCode,
  chatModeOptions,
  chatModesAllowed,
  chatTabVisible,
  composerState,
  effectiveChatMode,
  failedStatusKey,
  isClassroom,
  normalizeChatMode,
  showFilteredNote,
  withChatModeFromError,
} from '@/features/chat/modes';

const family = (over: Partial<Family> = {}): Family => ({
  id: 1,
  name: 'Class 4B',
  timezone: 'America/Toronto',
  country_code: 'CA',
  tier: 'classroom',
  owner_user_id: 1,
  member_count: 3,
  chat_filter: true,
  chat_mode: 'normal',
  ...over,
});

const me = (fam: Family | null): MePayload => ({ family: fam }) as unknown as MePayload;

const msg = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 1,
  member_id: 4,
  nickname: 'Sam',
  avatar: null,
  body: 'oh ★★★★',
  deleted: false,
  client_id: null,
  created_at: '2026-11-20T10:00:00Z',
  filtered: true,
  reactions: [],
  ...over,
});

const hasKey = (path: string) =>
  path.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], en) !==
  undefined;

describe('chat mode', () => {
  it('reads the effective mode from `me` (absent or unknown = normal)', () => {
    expect(effectiveChatMode(undefined)).toBe('normal');
    expect(effectiveChatMode(me(null))).toBe('normal');
    expect(effectiveChatMode(me(family({ chat_mode: undefined })))).toBe('normal');
    expect(effectiveChatMode(me(family({ chat_mode: 'party' })))).toBe('normal');
    expect(effectiveChatMode(me(family({ chat_mode: 'announcements' })))).toBe('announcements');
    expect(effectiveChatMode(me(family({ chat_mode: 'off' })))).toBe('off');
    expect(normalizeChatMode(null)).toBe('normal');
  });

  it.each([
    ['normal', false, 'composer', true],
    ['normal', true, 'composer', true],
    ['announcements', true, 'announcer', true],
    ['announcements', false, 'readOnly', false],
    ['off', true, 'off', false],
    ['off', false, 'off', false],
  ] as const)('%s, admin %s → %s (may post: %s)', (mode, admin, state, post) => {
    expect(composerState(mode, admin)).toBe(state);
    expect(canPostInMode(mode, admin)).toBe(post);
  });

  it('hides the Chat tab only when chat is off', () => {
    expect(chatTabVisible(undefined)).toBe(true);
    expect(chatTabVisible(me(family()))).toBe(true);
    expect(chatTabVisible(me(family({ chat_mode: 'announcements' })))).toBe(true);
    expect(chatTabVisible(me(family({ chat_mode: 'off' })))).toBe(false);
  });

  it('modes are allowed only when the policy says so (absent = no)', () => {
    const policy = (chat: Policy['chat']) => ({ chat }) as Policy;
    expect(chatModesAllowed(undefined)).toBe(false);
    expect(chatModesAllowed(policy(undefined))).toBe(false);
    expect(chatModesAllowed(policy({ retention_days: 365 }))).toBe(false);
    expect(chatModesAllowed(policy({ retention_days: 365, modes_allowed: false }))).toBe(false);
    expect(chatModesAllowed(policy({ retention_days: 365, modes_allowed: true }))).toBe(true);
  });

  it('classroom wording only for the classroom tier', () => {
    expect(isClassroom('classroom')).toBe(true);
    expect(isClassroom('big_clan')).toBe(false);
    expect(isClassroom(undefined)).toBe(false);
  });

  it('mode picker cards: three modes in order, classroom wording, keys exist', () => {
    expect(chatModeOptions(false).map((o) => o.mode)).toEqual(['normal', 'announcements', 'off']);
    expect(chatModeOptions(true)[1].bodyKey).toBe('family.chatSafety.announcementsBodyClassroom');
    expect(chatModeOptions(false)[1].bodyKey).toBe('family.chatSafety.announcementsBody');
    for (const option of [...chatModeOptions(true), ...chatModeOptions(false)]) {
      expect(hasKey(option.titleKey)).toBe(true);
      expect(hasKey(option.bodyKey)).toBe(true);
    }
  });
});

describe('profanity filter', () => {
  it('is on unless the server says off (absent = on)', () => {
    expect(chatFilterOn(undefined)).toBe(true);
    expect(chatFilterOn(family({ chat_filter: undefined }))).toBe(true);
    expect(chatFilterOn(family({ chat_filter: true }))).toBe(true);
    expect(chatFilterOn(family({ chat_filter: false }))).toBe(false);
  });

  it('"Some words were hidden" only for the author of a masked message', () => {
    expect(showFilteredNote(msg(), 4)).toBe(true);
    // Others just see ★.
    expect(showFilteredNote(msg(), 5)).toBe(false);
    expect(showFilteredNote(msg(), null)).toBe(false);
    expect(showFilteredNote(msg({ filtered: false }), 4)).toBe(false);
    expect(showFilteredNote(msg({ filtered: undefined }), 4)).toBe(false);
    expect(showFilteredNote(msg({ deleted: true, body: null }), 4)).toBe(false);
  });
});

describe('mode refusals (403)', () => {
  const err = (code: string, status = 403) => new ApiError(status, 'no', code);

  it('recognizes chat_read_only and chat_off only', () => {
    expect(chatModeErrorCode(err('chat_read_only'))).toBe('chat_read_only');
    expect(chatModeErrorCode(err('chat_off'))).toBe('chat_off');
    expect(chatModeErrorCode(err('chat_disabled'))).toBeNull();
    expect(chatModeErrorCode(new Error('chat_off'))).toBeNull();
  });

  it('patches `me` with the mode the refusal reveals', () => {
    const current = me(family());
    expect(withChatModeFromError(current, 'chat_off')?.family?.chat_mode).toBe('off');
    expect(withChatModeFromError(current, 'chat_read_only')?.family?.chat_mode).toBe(
      'announcements',
    );
    // Unchanged objects stay the same; no family, nothing to patch.
    const off = me(family({ chat_mode: 'off' }));
    expect(withChatModeFromError(off, 'chat_off')).toBe(off);
    expect(withChatModeFromError(undefined, 'chat_off')).toBeUndefined();
    const noFamily = me(null);
    expect(withChatModeFromError(noFamily, 'chat_off')).toBe(noFamily);
  });

  it.each([
    ['rate_limited', false, 'chat.failedRateLimited'],
    ['chat_disabled', false, 'chat.disabledTitle'],
    ['chat_read_only', false, 'chat.failedReadOnly'],
    ['chat_read_only', true, 'chat.failedReadOnlyClassroom'],
    ['chat_off', true, 'chat.failedOff'],
    ['validation_failed', false, 'chat.failed'],
    [null, false, 'chat.failed'],
  ] as const)('"Not sent" status for %s (classroom %s) → %s', (code, classroom, key) => {
    expect(failedStatusKey(code, classroom)).toBe(key);
    expect(hasKey(key)).toBe(true);
  });
});
