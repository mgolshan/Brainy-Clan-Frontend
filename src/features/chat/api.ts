import { api, ApiError } from '@/api/client';
import type {
  ChatMessage,
  ChatMessagesPage,
  ChatReadBody,
  ChatUnread,
  Envelope,
  SendChatMessageBody,
} from '@/api/types';

/**
 * Family chat endpoints (`/family/chat/*`, contract 2026-10-23). Message bodies are never
 * logged here or anywhere else (the Sentry config strips request bodies too).
 */

export function fetchChatMessages(
  cursor: { before?: number | null; after?: number | null },
  limit: number,
  signal?: AbortSignal,
): Promise<ChatMessagesPage> {
  const params = [`limit=${limit}`];
  if (cursor.before) params.push(`before=${cursor.before}`);
  if (cursor.after) params.push(`after=${cursor.after}`);
  return api.get<ChatMessagesPage>(`/family/chat/messages?${params.join('&')}`, { signal });
}

export async function postChatMessage(body: SendChatMessageBody): Promise<ChatMessage> {
  return (await api.post<Envelope<ChatMessage>>('/family/chat/messages', body)).data;
}

export function deleteChatMessage(id: number): Promise<void> {
  return api.delete(`/family/chat/messages/${id}`);
}

export function postChatRead(body: ChatReadBody): Promise<void> {
  return api.post<void>('/family/chat/read', body);
}

export async function fetchChatUnread(signal?: AbortSignal): Promise<ChatUnread> {
  return (await api.get<Envelope<ChatUnread>>('/family/chat/unread', { signal })).data;
}

/** 403 `chat_disabled`: a parent turned chat off for this member. */
export function isChatDisabledError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'chat_disabled';
}
