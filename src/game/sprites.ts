/* 과일 스프라이트 — webp를 오프스크린 캔버스에 미리 렌더해 두는 DOM 로더 */

import { FRUITS, MAX_LEVEL } from './fruits';

export interface Sprite {
  cv: HTMLCanvasElement;
  cx: number;
  cy: number;
  S: number;
}

/** 스프라이트 해상도 배율 — 보드 표시 크기 대비 2배면 충분히 선명 */
export const SPRITE_SCALE = 2;
const SPRITE_SIZE_K = 2.35;
const SPRITE_DRAW_K = 2.23;
const SPRITE_DRAW_MAX_K = 1.95;

export function fruitImageUrl(i: number): string {
  return `${import.meta.env.BASE_URL}fruits/fruit-${String(i).padStart(2, '0')}.webp`;
}

export function makeSprites(): Sprite[] {
  return FRUITS.map(({ r }) => {
    const S = Math.ceil(r * SPRITE_SIZE_K);
    const cv = document.createElement('canvas');
    cv.width = cv.height = S * SPRITE_SCALE;
    return { cv, cx: S / 2, cy: S / 2, S };
  });
}

export async function loadSprites(sprites: Sprite[]): Promise<void> {
  await Promise.all(
    sprites.map(
      (sprite, i) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const c = sprite.cv.getContext('2d');
            if (!c) {
              reject(new Error('2d context unavailable'));
              return;
            }
            const r = FRUITS[i].r;
            const size = r * (i === MAX_LEVEL ? SPRITE_DRAW_MAX_K : SPRITE_DRAW_K);
            c.clearRect(0, 0, sprite.cv.width, sprite.cv.height);
            c.setTransform(SPRITE_SCALE, 0, 0, SPRITE_SCALE, 0, 0);
            c.drawImage(img, sprite.cx - size / 2, sprite.cy - size / 2, size, size);
            resolve();
          };
          img.onerror = () => reject(new Error(`fruit sprite ${i} failed to load`));
          img.src = fruitImageUrl(i);
        }),
    ),
  );
}
