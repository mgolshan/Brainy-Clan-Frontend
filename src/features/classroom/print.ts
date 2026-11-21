/**
 * iOS/Android: no print module is installed (`expo-print` is not a dependency), so the screens
 * offer share / copy (codes) and the CSV file (summary) instead. `print.web.ts` prints.
 */
export const canPrint = false;

export async function printHtml(_html: string): Promise<void> {
  throw new Error('printing unavailable');
}
