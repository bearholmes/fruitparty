/* 과일 데이터와 캐릭터 스프라이트 */

export interface FruitPalette {
  top: string;
  mid: string;
  bot: string;
  line: string;
}

export interface Fruit {
  name: string;
  r: number;
  /** 과육 외곽에 맞춘 충돌 타원의 반경 비율과 이미지 중심 보정값 (r 기준) */
  hitbox: { x: number; y: number };
  artOffsetY: number;
  score: number;
  pal: FruitPalette;
}

export interface Sprite {
  cv: HTMLCanvasElement;
  cx: number;
  cy: number;
  S: number;
}

export const FRUITS: Fruit[] = [
  {
    name: '방울토마토',
    r: 19,
    hitbox: { x: 0.82, y: 0.8 },
    artOffsetY: 0.16,
    score: 1,
    pal: { top: '#ff9a80', mid: '#e8443e', bot: '#a92d32', line: '#712a30' },
  },
  {
    name: '딸기',
    r: 23,
    hitbox: { x: 0.75, y: 0.82 },
    artOffsetY: 0.14,
    score: 3,
    pal: { top: '#ff8d83', mid: '#ee4349', bot: '#b72f3d', line: '#792c35' },
  },
  {
    name: '귤',
    r: 32,
    hitbox: { x: 0.87, y: 0.82 },
    artOffsetY: 0.14,
    score: 6,
    pal: { top: '#ffd283', mid: '#f89835', bot: '#cb6224', line: '#874525' },
  },
  {
    name: '참다래',
    r: 41,
    hitbox: { x: 0.85, y: 0.91 },
    artOffsetY: 0.06,
    score: 10,
    pal: { top: '#f5c779', mid: '#c17a36', bot: '#7e4725', line: '#5a321e' },
  },
  {
    name: '복숭아',
    r: 52,
    hitbox: { x: 0.91, y: 0.83 },
    artOffsetY: 0.09,
    score: 15,
    pal: { top: '#ffe0c8', mid: '#f7a6a0', bot: '#db777c', line: '#9a5b5d' },
  },
  {
    name: '사과',
    r: 63,
    hitbox: { x: 0.84, y: 0.81 },
    artOffsetY: 0.18,
    score: 21,
    pal: { top: '#ff9c80', mid: '#e64e46', bot: '#ae3034', line: '#742b30' },
  },
  {
    name: '배',
    r: 73,
    hitbox: { x: 0.84, y: 0.82 },
    artOffsetY: 0.12,
    score: 28,
    pal: { top: '#f8e0a0', mid: '#deb765', bot: '#ad7a40', line: '#775634' },
  },
  {
    name: '포도',
    r: 84,
    hitbox: { x: 0.73, y: 0.81 },
    artOffsetY: 0.1,
    score: 36,
    pal: { top: '#c49bde', mid: '#824aa7', bot: '#533076', line: '#3d2b59' },
  },
  {
    name: '참외',
    r: 96,
    hitbox: { x: 0.72, y: 0.83 },
    artOffsetY: 0.12,
    score: 45,
    pal: { top: '#ffe796', mid: '#f8c844', bot: '#dc9b2d', line: '#93672b' },
  },
  {
    name: '단감',
    r: 110,
    hitbox: { x: 0.84, y: 0.72 },
    artOffsetY: 0.08,
    score: 60,
    pal: { top: '#ffc25e', mid: '#f67f17', bot: '#b34a00', line: '#7a3200' },
  },
];

export const MAX_LEVEL = FRUITS.length - 1;
export const DROP_POOL: number[] = [0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4];
/** 피버 중 드롭 풀 — 상위 과일 위주로 나와 합체가 쉬워짐 */
export const FEVER_DROP_POOL: number[] = [2, 2, 3, 3, 3, 4, 4, 5];

export function randDrop(): number {
  return DROP_POOL[Math.floor(Math.random() * DROP_POOL.length)] ?? 0;
}

export function randFeverDrop(): number {
  return FEVER_DROP_POOL[Math.floor(Math.random() * FEVER_DROP_POOL.length)] ?? 2;
}

export function makeSprites(): Sprite[] {
  return FRUITS.map(({ r }) => {
    const S = Math.ceil(r * 2.35);
    const cv = document.createElement('canvas');
    cv.width = cv.height = S * 3;
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
            const size = r * (i === MAX_LEVEL ? 1.95 : 2.23);
            c.clearRect(0, 0, sprite.cv.width, sprite.cv.height);
            c.setTransform(3, 0, 0, 3, 0, 0);
            c.drawImage(img, sprite.cx - size / 2, sprite.cy - size / 2, size, size);
            resolve();
          };
          img.onerror = () => reject(new Error(`fruit sprite ${i} failed to load`));
          img.src = `${import.meta.env.BASE_URL}fruits/fruit-${String(i).padStart(2, '0')}.webp`;
        }),
    ),
  );
}
