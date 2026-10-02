/* 과일 데이터 — 10단계 과일 정의와 드롭 풀. DOM 의존 없음 */

import { MAX_DROP_LEVEL, DROP_WEIGHTS, EARLY_GAME_DROP_LIMIT, EARLY_MAX_DROP_LEVEL } from './config/drops';
import { FEVER_MIN_DROP_LEVEL, FEVER_MAX_DROP_LEVEL, FEVER_DROP_WEIGHTS } from './config/fever';

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

function buildDropPool(maxLevel: number): number[] {
  return DROP_WEIGHTS.flatMap((w, lv) => (lv <= maxLevel ? Array<number>(w).fill(lv) : []));
}

/** 일반 드롭 풀 — DROP_WEIGHTS를 MAX_DROP_LEVEL까지 펼친 것 */
export const DROP_POOL: number[] = buildDropPool(MAX_DROP_LEVEL);
/** 초반 드롭 풀 — DROP_WEIGHTS를 EARLY_MAX_DROP_LEVEL까지 펼친 것 */
export const EARLY_DROP_POOL: number[] = buildDropPool(EARLY_MAX_DROP_LEVEL);
/** 피버 중 드롭 풀 — FEVER_DROP_WEIGHTS를 [MIN, MAX] 구간만큼 펼친 것 */
export const FEVER_DROP_POOL: number[] = FEVER_DROP_WEIGHTS.flatMap((w, lv) =>
  lv >= FEVER_MIN_DROP_LEVEL && lv <= FEVER_MAX_DROP_LEVEL ? Array<number>(w).fill(lv) : [],
);

/** 누적 낙하 개수 구간에 맞는 풀에서 뽑는다 — 초반엔 상위 과일도 등장 */
export function randDrop(dropCount: number): number {
  const pool = dropCount < EARLY_GAME_DROP_LIMIT ? EARLY_DROP_POOL : DROP_POOL;
  return pool[Math.floor(Math.random() * pool.length)] ?? 0;
}

export function randFeverDrop(): number {
  return FEVER_DROP_POOL[Math.floor(Math.random() * FEVER_DROP_POOL.length)] ?? FEVER_MIN_DROP_LEVEL;
}
