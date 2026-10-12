/**
 * Dev-only render counter for profiling heavy puzzle cells: increments
 * `globalThis.__renderCounts[name]` on every render (read it from the debugger / browser console,
 * e.g. tap a 9×9 Sudoku cell and compare `__renderCounts.SudokuCell` before and after).
 * A no-op in production builds.
 */
type Counts = Record<string, number>;

export function useRenderCount(name: string): void {
  if (!__DEV__) return;
  const g = globalThis as { __renderCounts?: Counts };
  const counts = (g.__renderCounts ??= {});
  counts[name] = (counts[name] ?? 0) + 1;
}
