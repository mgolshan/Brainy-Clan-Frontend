import { ApiError } from '@/api/client';
import type { SupportMessage } from '@/api/types';
import {
  COUNTER_FROM,
  MAX_DEVICE_LENGTH,
  MAX_MESSAGE_LENGTH,
  SUPPORT_TOPICS,
  apiPlatform,
  appVersionField,
  codePointLength,
  deviceSummary,
  firstLine,
  isSupportTopic,
  messageProblem,
  sendErrorKind,
  showCounter,
  statusBadge,
  topicIcon,
  upsertMessage,
} from '@/features/support/model';
import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';

const lookup = (tree: object, path: string) =>
  path.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], tree);

describe('topics', () => {
  it('lists the seven contract topics in order', () => {
    expect(SUPPORT_TOPICS.map((t) => t.key)).toEqual([
      'account',
      'billing',
      'bug',
      'content',
      'privacy',
      'idea',
      'other',
    ]);
  });

  it.each(SUPPORT_TOPICS.map((t) => t.key))('%s has en + fr labels', (key) => {
    expect(typeof lookup(en, `support.topics.${key}`)).toBe('string');
    expect(typeof lookup(fr, `support.topics.${key}`)).toBe('string');
  });

  it('guards topics and falls back to the "other" icon', () => {
    expect(isSupportTopic('bug')).toBe(true);
    expect(isSupportTopic('spam')).toBe(false);
    expect(topicIcon('spam')).toBe(topicIcon('other'));
  });
});

describe('message validation', () => {
  it('counts code points like the server (emoji = 1)', () => {
    expect(codePointLength('👍👍')).toBe(2);
    expect('👍👍'.length).toBe(4);
  });

  it.each([
    ['', 'empty'],
    ['    \n ', 'empty'],
    ['too short', 'tooShort'],
    ['  123456789  ', 'tooShort'],
    ['1234567890', null],
    ['👍'.repeat(10), null],
    ['a'.repeat(MAX_MESSAGE_LENGTH), null],
    ['a'.repeat(MAX_MESSAGE_LENGTH + 1), 'tooLong'],
    [`  ${'a'.repeat(MAX_MESSAGE_LENGTH)}  `, null],
  ])('%j → %s', (text, problem) => {
    expect(messageProblem(text)).toBe(problem);
  });

  it('shows the counter only near the limit', () => {
    expect(showCounter('a'.repeat(COUNTER_FROM - 1))).toBe(false);
    expect(showCounter('a'.repeat(COUNTER_FROM))).toBe(true);
  });
});

describe('status badge', () => {
  it.each([
    ['open', 'support.status.open', 'Received', 'Reçu'],
    ['answered', 'support.status.answered', 'Answered', 'Répondu'],
    ['closed', 'support.status.closed', 'Closed', 'Fermé'],
    ['something_new', 'support.status.open', 'Received', 'Reçu'],
  ])('%s → %s', (status, key, enLabel, frLabel) => {
    const badge = statusBadge(status);
    expect(badge.labelKey).toBe(key);
    expect(lookup(en, key)).toBe(enLabel);
    expect(lookup(fr, key)).toBe(frLabel);
  });
});

describe('list helpers', () => {
  it('takes the first non-empty line', () => {
    expect(firstLine('\n  Hello there  \r\nsecond')).toBe('Hello there');
    expect(firstLine('')).toBe('');
  });

  const msg = (id: number, created_at: string): SupportMessage => ({
    id,
    topic: 'bug',
    message: 'Something broke here',
    status: 'open',
    created_at,
    answered_at: null,
  });

  it('upserts newest first without duplicates', () => {
    const list = [msg(2, '2026-11-08T10:00:00Z'), msg(1, '2026-11-07T10:00:00Z')];
    const next = upsertMessage(list, msg(3, '2026-11-08T12:00:00Z'));
    expect(next.map((m) => m.id)).toEqual([3, 2, 1]);
    expect(upsertMessage(next, msg(3, '2026-11-08T12:00:00Z')).map((m) => m.id)).toEqual([3, 2, 1]);
    expect(upsertMessage(undefined, msg(1, '2026-11-07T10:00:00Z'))).toHaveLength(1);
  });
});

describe('context', () => {
  it('summarises model + OS only', () => {
    expect(deviceSummary({ modelName: 'iPad Air', osName: 'iPadOS', osVersion: '18.1' })).toBe(
      'iPad Air (iPadOS 18.1)',
    );
    expect(deviceSummary({ modelName: null, osName: 'Windows', osVersion: '10' })).toBe(
      'Windows 10',
    );
    expect(deviceSummary({ modelName: 'Pixel 8', osName: null, osVersion: null })).toBe('Pixel 8');
    expect(deviceSummary({ modelName: null, osName: null, osVersion: null })).toBeUndefined();
  });

  it('caps the device at 80 and the version at 20 characters', () => {
    const long = deviceSummary({ modelName: 'X'.repeat(100), osName: 'iOS', osVersion: '18' });
    expect(long).toHaveLength(MAX_DEVICE_LENGTH);
    expect(appVersionField('1.0.0')).toBe('1.0.0');
    expect(appVersionField('1'.repeat(30))).toHaveLength(20);
  });

  it('maps the platform', () => {
    expect(apiPlatform('ios')).toBe('ios');
    expect(apiPlatform('android')).toBe('android');
    expect(apiPlatform('web')).toBe('web');
    expect(apiPlatform('windows')).toBe('web');
  });
});

describe('send errors', () => {
  it.each([
    [new ApiError(0, 'offline', 'network_error'), 'network'],
    [new ApiError(0, 'slow', 'timeout'), 'network'],
    [new ApiError(429, 'slow down', 'rate_limited'), 'rate_limited'],
    [new ApiError(403, 'no', 'forbidden'), 'forbidden'],
    [new ApiError(422, 'bad', 'validation_failed'), 'validation'],
    [new ApiError(500, 'boom', 'unknown'), 'other'],
    [new Error('boom'), 'other'],
  ])('%s → %s', (error, kind) => {
    expect(sendErrorKind(error)).toBe(kind);
  });
});
