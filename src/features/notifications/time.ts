/** `HH:MM` (24 h) helpers for notification times. */

export interface HourMinute {
  hour: number;
  minute: number;
}

export function parseTime(value: string | null | undefined): HourMinute | null {
  const match = value ? /^(\d{1,2}):(\d{2})/.exec(value) : null;
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function formatTime({ hour, minute }: HourMinute): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export const pad2 = (n: number) => String(n).padStart(2, '0');
