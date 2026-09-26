/* Matter 바디 팩토리 — 과일·벽 생성 (마찰·밀도·반발은 config) */

import { Bodies, Body, Composite } from 'matter-js';
import { FRUITS } from '../fruits';
import { BOARD_W, BOARD_H, WALL } from '../config/board';
import {
  FRUIT_RESTITUTION,
  FRICTION_AIR,
  DENSITY_BASE,
  DENSITY_PER_LEVEL,
  WALL_FRICTION,
  WALL_RESTITUTION,
} from '../config/physics';

/** 과일 식별용 커스텀 필드를 단 Matter 바디 */
export type FruitBody = Body & { fruitLevel?: number; merged?: boolean };

export function fruitDensity(level: number): number {
  return DENSITY_BASE + level * DENSITY_PER_LEVEL;
}

export function createFruitBody(x: number, y: number, level: number, friction: number): FruitBody {
  const body = Bodies.circle(x, y, FRUITS[level].r, {
    restitution: FRUIT_RESTITUTION,
    friction,
    frictionAir: FRICTION_AIR,
    density: fruitDensity(level),
  }) as FruitBody;
  Body.scale(body, FRUITS[level].hitbox.x, FRUITS[level].hitbox.y);
  body.fruitLevel = level;
  return body;
}

export function createWalls(): Body[] {
  const opt = { isStatic: true, friction: WALL_FRICTION, restitution: WALL_RESTITUTION };
  return [
    Bodies.rectangle(BOARD_W / 2, BOARD_H - WALL / 2 + 8, BOARD_W, WALL + 16, opt),
    Bodies.rectangle(WALL / 2 - 8, BOARD_H / 2, WALL + 16, BOARD_H, opt),
    Bodies.rectangle(BOARD_W - WALL / 2 + 8, BOARD_H / 2, WALL + 16, BOARD_H, opt),
  ];
}

/** 이번 프레임 과일 바디만 모아 재사용 배열에 채운다 (필터 배열 할당 없음) */
export function collectFruitBodies(world: Composite, out: FruitBody[]): FruitBody[] {
  out.length = 0;
  for (const b of Composite.allBodies(world)) {
    if (!b.isStatic && (b as FruitBody).fruitLevel !== undefined) out.push(b as FruitBody);
  }
  return out;
}
