/* 과일 스프라이트 그리기 */

import { FRUITS } from '../fruits';
import type { Sprite } from '../sprites';

export function drawFruit(
  ctx: CanvasRenderingContext2D,
  sprites: Sprite[],
  x: number,
  y: number,
  lv: number,
  angle = 0,
  ghost = false,
): void {
  const s = sprites[lv];
  ctx.save();
  ctx.globalAlpha = ghost ? 0.92 : 1;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(s.cv, -s.cx, -s.cy - FRUITS[lv].r * FRUITS[lv].artOffsetY, s.S, s.S);
  ctx.restore();
}
