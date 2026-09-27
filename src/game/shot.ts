/* 게임 결과 이미지 합성 — 보드 캡처 아래에 스코어·콤보·피버·종료시간 푸터를 붙인다.
   푸터 텍스트는 폭에 맞춰 폰트를 줄여 잘림 없이 그린다. */

export interface ShotStats {
  score: number;
  best: number;
  maxCombo: number;
  feverCount: number;
  gameOverAt: number | null;
}

export const SHOT_FOOTER_H = 176;
const SHOT_BG = '#fffdf7';
const SHOT_INK = '#3d2b1f';
const SHOT_MUTED = '#728176';
const SHOT_LINE = '#e5e0d2';

export function formatShotDate(ts: number | null): string {
  const d = new Date(ts ?? Date.now());
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export interface ShotLine {
  text: string;
  px: number;
  weight: number;
  color: string;
  /** 보드 하단 기준 베이스라인 오프셋 */
  y: number;
}

export function buildShotLines(stats: ShotStats): ShotLine[] {
  return [
    { text: `SCORE ${stats.score}`, px: 36, weight: 800, color: SHOT_INK, y: 52 },
    {
      text: `MAX COMBO ${stats.maxCombo} · FEVER ${stats.feverCount}`,
      px: 24,
      weight: 800,
      color: SHOT_INK,
      y: 104,
    },
    { text: formatShotDate(stats.gameOverAt), px: 22, weight: 400, color: SHOT_MUTED, y: 144 },
  ];
}

/* measureAt(px)으로 잰 너비가 maxWidth 안에 들도록 폰트를 줄인다 */
export function fitFontPx(
  basePx: number,
  maxWidth: number,
  measureAt: (px: number) => number,
  minPx = 12,
): number {
  let px = basePx;
  while (px > minPx && measureAt(px) > maxWidth) px -= 2;
  return px;
}

export function composeResultShot(source: HTMLCanvasElement, stats: ShotStats): HTMLCanvasElement {
  const W = source.width;
  const H = source.height;
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H + SHOT_FOOTER_H;
  const c = out.getContext('2d');
  if (!c) return out;
  c.fillStyle = SHOT_BG;
  c.fillRect(0, 0, out.width, out.height);
  c.drawImage(source, 0, 0);
  c.fillStyle = SHOT_LINE;
  c.fillRect(0, H, W, 2);
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  const maxWidth = W - 32;
  for (const line of buildShotLines(stats)) {
    const px = fitFontPx(
      line.px,
      maxWidth,
      (p) => {
        c.font = `${line.weight} ${p}px Jua, sans-serif`;
        return c.measureText(line.text).width;
      },
    );
    c.font = `${line.weight} ${px}px Jua, sans-serif`;
    c.fillStyle = line.color;
    c.fillText(line.text, W / 2, H + line.y);
  }
  return out;
}
