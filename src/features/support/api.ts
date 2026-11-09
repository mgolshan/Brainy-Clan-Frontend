import { api } from '@/api/client';
import type { Envelope, SendSupportMessageBody, SupportMessage } from '@/api/types';

/**
 * Support messages (`/support/messages`, contract 2026-11-08), family admins only. Message
 * texts are never logged here (the Sentry config strips request bodies too).
 */

/** `GET /support/messages` → the caller's own messages, newest first (at most 50). */
export async function fetchSupportMessages(signal?: AbortSignal): Promise<SupportMessage[]> {
  return (await api.get<Envelope<SupportMessage[]>>('/support/messages', { signal })).data;
}

/**
 * `POST /support/messages` → 201, or 200 with the stored message when this `client_id` was
 * already sent (a retry after a network error never creates a second message).
 */
export async function postSupportMessage(body: SendSupportMessageBody): Promise<SupportMessage> {
  return (await api.post<Envelope<SupportMessage>>('/support/messages', body)).data;
}
