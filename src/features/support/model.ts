import { ApiError } from '@/api/client';
import type { Platform, SupportMessage, SupportStatus, SupportTopic } from '@/api/types';
import type { IconName } from '@/ui';

/**
 * Pure helpers of the "Contact support" screen (contract "Support messages (2026-11-08)"):
 * topics, message validation, status labels, device summary, error kinds.
 */

/** Message length limits, in Unicode code points after trimming (like the server). */
export const MIN_MESSAGE_LENGTH = 10;
export const MAX_MESSAGE_LENGTH = 5000;
/** The counter appears from this length on. */
export const COUNTER_FROM = 4500;
/** Server limits of the context fields. */
export const MAX_APP_VERSION_LENGTH = 20;
export const MAX_DEVICE_LENGTH = 80;

/** Topics in display order, with their icon (labels: `support.topics.<key>`). */
export const SUPPORT_TOPICS: readonly { key: SupportTopic; icon: IconName }[] = [
  { key: 'account', icon: 'person-circle-outline' },
  { key: 'billing', icon: 'card-outline' },
  { key: 'bug', icon: 'bug-outline' },
  { key: 'content', icon: 'flag-outline' },
  { key: 'privacy', icon: 'shield-checkmark-outline' },
  { key: 'idea', icon: 'bulb-outline' },
  { key: 'other', icon: 'chatbubble-ellipses-outline' },
];

export function isSupportTopic(value: unknown): value is SupportTopic {
  return SUPPORT_TOPICS.some((topic) => topic.key === value);
}

/** Icon of a topic (unknown topics from a newer server get the "other" icon). */
export function topicIcon(topic: string): IconName {
  return SUPPORT_TOPICS.find((t) => t.key === topic)?.icon ?? 'chatbubble-ellipses-outline';
}

/** Length in Unicode code points (an emoji counts once, as on the server). */
export function codePointLength(text: string): number {
  return [...text].length;
}

export type MessageProblem = 'empty' | 'tooShort' | 'tooLong' | null;

/** Why the (trimmed) message can't be sent yet, or `null` when it can. */
export function messageProblem(text: string): MessageProblem {
  const length = codePointLength(text.trim());
  if (length === 0) return 'empty';
  if (length < MIN_MESSAGE_LENGTH) return 'tooShort';
  if (length > MAX_MESSAGE_LENGTH) return 'tooLong';
  return null;
}

/** Whether the counter "4,620 / 5,000" is shown. */
export function showCounter(text: string): boolean {
  return codePointLength(text.trim()) >= COUNTER_FROM;
}

export type StatusLabelKey =
  'support.status.open' | 'support.status.answered' | 'support.status.closed';

/** Status badge: label key + tone. Unknown statuses read as "Received". */
export function statusBadge(status: SupportStatus | string): {
  labelKey: StatusLabelKey;
  tone: 'primary' | 'success' | 'neutral';
  icon: IconName;
} {
  switch (status) {
    case 'answered':
      return { labelKey: 'support.status.answered', tone: 'success', icon: 'mail-open-outline' };
    case 'closed':
      return { labelKey: 'support.status.closed', tone: 'neutral', icon: 'checkmark-done-outline' };
    default:
      return { labelKey: 'support.status.open', tone: 'primary', icon: 'time-outline' };
  }
}

/** First non-empty line of a message (the list shows it as the row title). */
export function firstLine(message: string): string {
  return (
    message
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? ''
  );
}

/** Adds or replaces a message in the cached list (newest first, deduped by id). */
export function upsertMessage(
  list: SupportMessage[] | undefined,
  message: SupportMessage,
): SupportMessage[] {
  const rest = (list ?? []).filter((m) => m.id !== message.id);
  return [message, ...rest].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
}

export interface DeviceFacts {
  modelName: string | null;
  osName: string | null;
  osVersion: string | null;
}

/**
 * "iPad Pro 11-inch (iPadOS 18.1)", "Pixel 8 (Android 15)", "Windows 10" on the web — model and
 * OS only, nothing that identifies the person. `undefined` when nothing is known.
 */
export function deviceSummary({ modelName, osName, osVersion }: DeviceFacts): string | undefined {
  const os = [osName, osVersion].filter((part) => !!part?.trim()).join(' ');
  const model = modelName?.trim();
  const summary = model ? (os ? `${model} (${os})` : model) : os;
  if (!summary) return undefined;
  return codePointLength(summary) > MAX_DEVICE_LENGTH
    ? [...summary].slice(0, MAX_DEVICE_LENGTH).join('')
    : summary;
}

/** `app_version` as the server accepts it (≤ 20 characters). */
export function appVersionField(version: string): string {
  return version.slice(0, MAX_APP_VERSION_LENGTH);
}

export function apiPlatform(os: string): Platform {
  return os === 'ios' ? 'ios' : os === 'android' ? 'android' : 'web';
}

export type SendErrorKind = 'network' | 'rate_limited' | 'forbidden' | 'validation' | 'other';

/**
 * How a failed send is shown: `network` (offline / timeout: keep the draft, offer a retry with
 * the same `client_id`), `rate_limited` (429), `forbidden` (no longer an admin), `validation`
 * (422, the server's localized message), `other`.
 */
export function sendErrorKind(error: unknown): SendErrorKind {
  if (!(error instanceof ApiError)) return 'other';
  if (error.isNetworkError) return 'network';
  if (error.status === 429 || error.code === 'rate_limited') return 'rate_limited';
  if (error.status === 403) return 'forbidden';
  if (error.status === 422) return 'validation';
  return 'other';
}
