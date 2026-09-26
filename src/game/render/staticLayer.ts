/* 정적 보드 레이어 — 배경·벽·줄무늬를 오프스크린에 한 번 그려두고 매 프레임 합성 */

import { BOARD_W, BOARD_H, WALL } from '../config/board';

const BG = '#eef5e9';
const BG_FEVER = '#fff3d3';
const WALL_COLOR = '#376f55';
const STRIPE = '#75a384';

export function createStaticLayer(fever: boolean): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = BOARD_W;
  cv.height = BOARD_H;
  const c = cv.getContext('2d');
  if (!c) return cv;
  c.fillStyle = fever ? BG_FEVER : BG;
  c.fillRect(0, 0, BOARD_W, BOARD_H);
  c.fillStyle = WALL_COLOR;
  c.fillRect(0, 0, WALL, BOARD_H);
  c.fillRect(BOARD_W - WALL, 0, WALL, BOARD_H);
  c.fillRect(0, BOARD_H - WALL, BOARD_W, WALL);
  c.fillStyle = STRIPE;
  for (let y = 10; y < BOARD_H; y += 26) {
    c.fillRect(4, y, 6, 12);
    c.fillRect(BOARD_W - 10, y, 6, 12);
  }
  return cv;
}
