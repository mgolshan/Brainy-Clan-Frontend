/**
 * The i18n key + options for the play header caption ("3 of 10 points"). Once the session's
 * target is reached the caption says so instead of showing more points than the target
 * ("12 of 10 points"). `count` drives the plural form (French: "1 point", "2 points").
 */
export function sessionProgressCaption(
  points: number,
  target: number,
): { key: 'play.progress' | 'play.progressReached'; options: { count: number; target: number } } {
  const reached = target > 0 && points >= target;
  return {
    key: reached ? 'play.progressReached' : 'play.progress',
    options: { count: points, target },
  };
}
