/* 연출 헬퍼 — 콤보 스타일·폰트 캐시·피버 불꽃 위치·위험 라벨 측정 캐시.
   매 프레임 문자열 할당·measureText를 피하기 위한 모듈 */

import { BOARD_W, BOARD_H, WALL } from '../config/board';

/** 콤보가 높을수록 합체 점수 텍스트를 크게·뜨겁게 */
export function comboStyle(combo: number): { size: number; color: string } {
  return {
    size: Math.min(34, 20 + combo * 2),
    color: combo >= 6 ? '#e63946' : combo >= 3 ? '#ff6b35' : '#3d2b1f',
  };
}

const fontCache = new Map<number, string>();

export function mergeFont(size: number): string {
  let f = fontCache.get(size);
  if (!f) {
    f = `800 ${size}px Roboto, Pretendard, sans-serif`;
    fontCache.set(size, f);
  }
  return f;
}

export const DANGER_FONT = '800 26px Roboto, Pretendard, sans-serif';

const labelWidthCache = new Map<string, number>();

/** 위험 라벨 너비 — 같은 문자열이면 측정값을 재사용 */
export function dangerLabelWidth(ctx: CanvasRenderingContext2D, label: string): number {
  let w = labelWidthCache.get(label);
  if (w === undefined) {
    w = ctx.measureText(label).width + 36;
    if (labelWidthCache.size > 32) labelWidthCache.clear();
    labelWidthCache.set(label, w);
  }
  return w;
}

export interface Spark {
  x: number;
  y: number;
  r: number;
  phase: number;
}

/** 피버 불꽃 16개 위치 — 프레임마다 다시 계산하지 않도록 미리 고정 */
export const FEVER_SPARKS: Spark[] = Array.from({ length: 16 }, (_, i) => ({
  x: WALL + 24 + ((i * 137) % (BOARD_W - WALL * 2 - 48)),
  y: 56 + ((i * 211) % (BOARD_H - 160)),
  r: 3 + (i % 3),
  phase: i * 2.4,
}));
