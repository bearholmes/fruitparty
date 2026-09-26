export const STEP_MS = 1000 / 60;

export function fixedSteps(elapsedMs: number, remainderMs: number): { steps: number; remainderMs: number } {
  const total = remainderMs + Math.min(Math.max(elapsedMs, 0), 100);
  const steps = Math.floor((total + 1e-6) / STEP_MS);
  return { steps, remainderMs: Math.max(0, total - steps * STEP_MS) };
}
