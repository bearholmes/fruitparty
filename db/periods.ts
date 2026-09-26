const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function periodStarts(now: Date): { daily: string; weekly: string } {
  const seoul = new Date(now.getTime() + SEOUL_OFFSET_MS);
  const midnight = Date.UTC(seoul.getUTCFullYear(), seoul.getUTCMonth(), seoul.getUTCDate()) - SEOUL_OFFSET_MS;
  const daysSinceMonday = (seoul.getUTCDay() + 6) % 7;
  return {
    daily: new Date(midnight).toISOString(),
    weekly: new Date(midnight - daysSinceMonday * DAY_MS).toISOString(),
  };
}
