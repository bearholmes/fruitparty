/* Web Audio 컨텍스트 싱글턴 — BGM·효과음이 하나의 컨텍스트를 공유 */

let ctx: AudioContext | null = null;

export function ensureAudioContext(): AudioContext | null {
  try {
    if (!ctx) {
      const AC =
        globalThis.AudioContext ??
        (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}
