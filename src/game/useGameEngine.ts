import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Engine, Body, Events, Composite } from 'matter-js';
import { FRUITS, MAX_LEVEL, randDrop, randFeverDrop } from './fruits';
import { makeSprites, loadSprites, fruitImageUrl } from './sprites';
import { useGameStore } from './store';
import { syncBgm, duckBgm, reshuffleBgm, resetTension } from './bgm';
import { sfx } from './sfx';
import { fixedSteps, STEP_MS } from './timing';
import { createFruitBody, createWalls, collectFruitBodies, type FruitBody } from './physics/bodies';
import { mergeScore } from './physics/scoring';
import { ContactTracker } from './physics/contacts';
import { updateOverflow } from './physics/overflow';
import { createStaticLayer } from './render/staticLayer';
import { comboStyle, mergeFont, dangerLabelWidth, DANGER_FONT, FEVER_SPARKS } from './render/fx';
import { drawFruit } from './render/fruitView';
import { attachGameInput, clientXToBoard } from './input';
import {
  BOARD_W,
  BOARD_H,
  WALL,
  DEADLINE_Y,
  DROP_Y,
  OVER_LIMIT_SEC,
  DANGER_AFTER_SEC,
  DROP_COOLDOWN_MS,
  SHAKE_COOLDOWN_MS,
  COMBO_WINDOW_FRAMES,
  TOAST_MS,
  FINAL_BONUS,
  EVO_TOAST_MIN_LEVEL,
  DANGER_SHAKE_MAX,
  DANGER_CLEAR_RESET_SEC,
  MERGE_DELAY_SEC,
  GRAVITY_Y,
  DROP_FRICTION,
  MERGE_FRICTION,
  DROP_INITIAL_VY,
  MERGE_SPAWN_FLOOR_PAD,
  KEY_MOVE_STEP,
  BUTTON_MOVE_STEP,
  SHAKE_VX_MIN,
  SHAKE_VX_VAR,
  SHAKE_VY_MIN,
  SHAKE_VY_VAR,
  SHAKE_SPIN,
  FEVER_DURATION_SEC,
  FEVER_SCORE_MULT,
  FEVER_DROP_COOLDOWN_MS,
  FEVER_COMBO_WINDOW_FRAMES,
  FEVER_BLAST_RADIUS,
  FEVER_BLAST_MAX_LEVEL,
  FEVER_MERGE_DELAY_SEC,
  FEVER_SHAKE_MULT,
  FEVER_SHAKE_COOLDOWN_MS,
} from './constants';

interface MergeAnim {
  x: number;
  y: number;
  t: number;
  text: string;
  size: number;
  color: string;
}

interface PopFx {
  x: number;
  y: number;
  lv: number;
  t: number;
}

interface CollisionEvent {
  pairs: Array<{ bodyA: Body; bodyB: Body }>;
}

/* 리렌더 없이 게임 루프에서 접근하는 뮤터블 상태 */
interface MutableGame {
  engine: Engine | null;
  current: number;
  next: number;
  dropX: number;
  canDrop: boolean;
  over: boolean;
  combo: number;
  comboTimer: number;
  overTime: Map<number, number>;
  tracker: ContactTracker<FruitBody>;
  bodies: FruitBody[];
  dangerT: number;
  dangerActive: boolean;
  dangerClearT: number;
  feverT: number;
  mergeAnim: MergeAnim[];
  pops: PopFx[];
  raf: number;
  last: number;
  physicsRemainderMs: number;
  toastTimer: number | null;
  dropTimer: number | null;
  shakeTimer: number | null;
}

function createMutable(): MutableGame {
  return {
    engine: null,
    current: randDrop(),
    next: useGameStore.getState().nextLv,
    dropX: BOARD_W / 2,
    canDrop: true,
    over: false,
    combo: 0,
    comboTimer: 0,
    overTime: new Map(),
    tracker: new ContactTracker(),
    bodies: [],
    dangerT: 0,
    dangerActive: false,
    dangerClearT: 0,
    feverT: 0,
    mergeAnim: [],
    pops: [],
    raf: 0,
    last: 0,
    physicsRemainderMs: 0,
    toastTimer: null,
    dropTimer: null,
    shakeTimer: null,
  };
}

/** 재시작 시 뮤터블 전체를 한 곳에서 리셋 (필드 누락 방지) */
function resetMutable(st: MutableGame): void {
  st.combo = 0;
  st.comboTimer = 0;
  st.physicsRemainderMs = 0;
  st.over = false;
  st.canDrop = true;
  st.overTime.clear();
  st.tracker.clear();
  st.bodies.length = 0;
  st.dangerT = 0;
  st.dangerActive = false;
  st.dangerClearT = 0;
  st.feverT = 0;
  st.mergeAnim = [];
  st.pops = [];
  st.dropTimer = clearTimer(st.dropTimer);
  st.shakeTimer = clearTimer(st.shakeTimer);
  st.current = randDrop();
  st.next = randDrop();
}

function clearTimer(t: number | null): null {
  if (t !== null) clearTimeout(t);
  return null;
}

function clampDropX(x: number, level: number): number {
  const radius = FRUITS[level].r * FRUITS[level].hitbox.x;
  return Math.max(WALL + radius, Math.min(BOARD_W - WALL - radius, x));
}

/* 수박게임 엔진 훅 — Matter 물리 + 스프라이트 렌더 오케스트레이터.
   규칙은 physics/, 렌더는 render/, 입력은 input.ts가 담당.
   UI 상태는 zustand 스토어가 소유, 루프·충돌 콜백에선 getState()로 접근.
   반환은 canvas ref와 액션만 (점수 등은 App에서 스토어 셀렉터로 구독). */
export function useGameEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const nextCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sprites = useMemo(() => (typeof document === 'undefined' ? [] : makeSprites()), []);

  const g = useRef<MutableGame | null>(null);
  if (g.current === null) g.current = createMutable();

  const showToast = useCallback((msg: string) => {
    const store = useGameStore.getState();
    const st = g.current;
    if (!st) return;
    store.showToast(msg);
    st.toastTimer = clearTimer(st.toastTimer);
    st.toastTimer = window.setTimeout(() => store.hideToast(), TOAST_MS);
  }, []);

  const drawNext = useCallback(
    (lv: number) => {
      const cv = nextCanvasRef.current;
      if (!cv) return;
      if (!nextCtxRef.current) nextCtxRef.current = cv.getContext('2d');
      const c = nextCtxRef.current;
      if (!c) return;
      const s = sprites[lv];
      c.clearRect(0, 0, 96, 96);
      const k = 84 / s.S;
      const w = s.S * k;
      c.drawImage(s.cv, (96 - w) / 2, (96 - w) / 2 - 4 * k, w, w);
    },
    [sprites],
  );

  useEffect(() => {
    // 도감 썸네일은 원본 webp URL로 (대형 스프라이트 toDataURL 변환 없이)
    useGameStore.getState().setEvoUrls(FRUITS.map((_, i) => fruitImageUrl(i)));
    let active = true;
    loadSprites(sprites)
      .then(() => {
        if (!active) return;
        drawNext(g.current?.next ?? 0);
      })
      .catch((error: unknown) => console.error(error));
    return () => {
      active = false;
    };
  }, [sprites, drawNext]);

  /* ---- 메인 이펙트: 엔진 생성 → 루프 → 클린업 ---- */
  useEffect(() => {
    const st = g.current;
    if (!st) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const store = useGameStore.getState;

    const engine = Engine.create({ enableSleeping: false });
    engine.gravity.y = GRAVITY_Y;
    st.engine = engine;
    const world = engine.world;
    Composite.add(world, createWalls());

    // 정적 배경은 한 번 그려두고 매 프레임 합성 (평상시/피버 2종)
    const normalLayer = createStaticLayer(false);
    const feverLayer = createStaticLayer(true);

    const pop = (x: number, y: number, lv: number): void => {
      st.pops.push({ x, y, lv, t: 0 });
    };

    const pulseCombo = (combo: number): void => {
      if (combo < 10 || combo % 10 !== 0) return;
      showToast(`🔥COMBO x${combo}!`);
      const holder = canvasRef.current?.parentElement;
      if (!holder) return;
      holder.classList.remove('combo-flash');
      void holder.clientWidth; // 애니메이션 리트리거
      holder.classList.add('combo-flash');
      setTimeout(() => holder.classList.remove('combo-flash'), 350);
    };

    const doMerge = (a: FruitBody, b: FruitBody): void => {
      if (a.merged || b.merged) return;
      const lv = a.fruitLevel ?? 0;
      a.merged = b.merged = true;
      const mx = (a.position.x + b.position.x) / 2;
      const my = (a.position.y + b.position.y) / 2;
      Composite.remove(world, a);
      Composite.remove(world, b);
      st.overTime.delete(a.id);
      st.overTime.delete(b.id);
      st.tracker.removeBody(a);
      st.tracker.removeBody(b);
      if (lv === MAX_LEVEL) {
        /* 단감 합체 보상 — 주변 낮은 과일을 점수로 전환해 공간을 확보하고 피버 시작 */
        let blastPts = 0;
        let swept = 0;
        for (const bd of Composite.allBodies(world)) {
          const fb = bd as FruitBody;
          const blv = fb.fruitLevel;
          if (bd.isStatic || blv === undefined || fb.merged) continue;
          if (blv > FEVER_BLAST_MAX_LEVEL) continue;
          const dx = bd.position.x - mx;
          const dy = bd.position.y - my;
          if (dx * dx + dy * dy > FEVER_BLAST_RADIUS * FEVER_BLAST_RADIUS) continue;
          fb.merged = true;
          Composite.remove(world, bd);
          st.overTime.delete(bd.id);
          st.tracker.removeBody(fb);
          const fpts = mergeScore(blv, st.combo, true);
          blastPts += fpts;
          pop(bd.position.x, bd.position.y, blv);
          st.mergeAnim.push({ x: bd.position.x, y: bd.position.y, t: 0, text: `+${fpts}`, size: 18, color: '#b35a00' });
          swept++;
        }
        const total = FINAL_BONUS + blastPts;
        store().addScore(total);
        st.mergeAnim.push({
          x: mx,
          y: my,
          t: 0,
          text: `+${total}`,
          size: 30,
          color: '#e63946',
        });
        pop(mx, my, lv);
        st.pops.push({ x: mx, y: my, lv, t: -0.25 }, { x: mx, y: my, lv, t: -0.5 });
        const holder = canvasRef.current?.parentElement;
        if (holder) {
          holder.classList.remove('fever-flash');
          void holder.clientWidth; // 애니메이션 리트리거
          holder.classList.add('fever-flash');
          setTimeout(() => holder.classList.remove('fever-flash'), 650);
        }
        st.feverT = FEVER_DURATION_SEC;
        store().startFever(FEVER_DURATION_SEC);
        showToast(
          swept > 0
            ? `🔥 피버타임 ${FEVER_DURATION_SEC}초! 점수 ${FEVER_SCORE_MULT}배·${swept}개 정리!`
            : `🔥 피버타임 ${FEVER_DURATION_SEC}초! 점수 ${FEVER_SCORE_MULT}배!`,
        );
        st.combo++;
        store().setCombo(st.combo);
        st.comboTimer = FEVER_COMBO_WINDOW_FRAMES;
        pulseCombo(st.combo);
        sfx.explosion();
        sfx.fever();
        duckBgm();
        return;
      }
      const nl = lv + 1;
      const body = createFruitBody(mx, Math.min(my, BOARD_H - MERGE_SPAWN_FLOOR_PAD), nl, MERGE_FRICTION);
      Composite.add(world, body);
      pop(mx, my, nl);
      const fever = st.feverT > 0;
      const pts = mergeScore(nl, st.combo, fever);
      store().addScore(pts);
      st.combo++;
      store().setCombo(st.combo);
      st.comboTimer = fever ? FEVER_COMBO_WINDOW_FRAMES : COMBO_WINDOW_FRAMES;
      st.mergeAnim.push({ x: mx, y: my, t: 0, text: `+${pts}`, ...comboStyle(st.combo) });
      sfx.merge(nl, st.combo);
      if (nl >= EVO_TOAST_MIN_LEVEL) showToast(`🎉 ${FRUITS[nl].name} 탄생!`);
      pulseCombo(st.combo);
    };

    const onActive = (e: CollisionEvent): void => {
      if (st.over || store().paused) return;
      for (const pair of e.pairs) {
        const a = pair.bodyA as FruitBody;
        const b = pair.bodyB as FruitBody;
        if (a.fruitLevel === undefined || b.fruitLevel === undefined) continue;
        if (a.fruitLevel !== b.fruitLevel) continue;
        if (a.merged || b.merged) continue;
        /* Engine.update 고정 스텝(STEP_MS)과 동일한 누적 단위 */
        st.tracker.touch(a, b, STEP_MS / 1000);
      }
      const need = st.feverT > 0 ? FEVER_MERGE_DELAY_SEC : MERGE_DELAY_SEC;
      for (const { a, b } of st.tracker.due(need)) {
        doMerge(a, b);
      }
    };
    Events.on(engine, 'collisionActive', onActive);

    const checkOverflow = (bodies: FruitBody[], dt: number): void => {
      const { maxT, overflowed } = updateOverflow(
        bodies,
        (b) => (b as FruitBody).fruitLevel ?? 0,
        st.overTime,
        dt,
      );
      if (overflowed) {
        st.over = true;
        st.feverT = 0;
        store().setFever(false, 0);
        store().gameOver();
        sfx.gameOver();
        if (store().isRecord) setTimeout(() => sfx.fanfare(), 700);
        return;
      }
      st.dangerT = maxT;
      const active = maxT > DANGER_AFTER_SEC;
      if (active && !st.dangerActive) showToast('⚠️ 선을 넘었어요!');
      if (!active) {
        st.dangerClearT += dt;
        if (
          st.dangerClearT >= DANGER_CLEAR_RESET_SEC &&
          store().dangerShakeLeft < DANGER_SHAKE_MAX
        ) {
          store().setDangerShakeLeft(DANGER_SHAKE_MAX);
        }
      } else {
        st.dangerClearT = 0;
      }
      if (active !== st.dangerActive) {
        st.dangerActive = active;
        store().setDanger(active);
      }
    };

    const draw = (t: number, bodies: FruitBody[]): void => {
      ctx.clearRect(0, 0, BOARD_W, BOARD_H);
      ctx.drawImage(st.feverT > 0 ? feverLayer : normalLayer, 0, 0);

      const danger = st.dangerT > DANGER_AFTER_SEC;
      ctx.save();
      ctx.strokeStyle = danger ? '#d94e4e' : '#a8bea8';
      ctx.lineWidth = danger ? 3 : 2;
      ctx.setLineDash([10, 7]);
      if (danger && Math.floor(t * 4) % 2 === 0) ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.moveTo(WALL + 4, DEADLINE_Y);
      ctx.lineTo(BOARD_W - WALL - 4, DEADLINE_Y);
      ctx.stroke();
      ctx.restore();

      if (!st.over) {
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = '#5b8a70';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(st.dropX, DROP_Y);
        ctx.lineTo(st.dropX, BOARD_H - WALL);
        ctx.stroke();
        ctx.restore();
        drawFruit(ctx, sprites, st.dropX, DROP_Y, st.current, 0, true);
      }

      for (const b of bodies) {
        const lv = b.fruitLevel;
        if (lv === undefined) continue;
        drawFruit(ctx, sprites, b.position.x, b.position.y, lv, b.angle, false);
      }

      st.mergeAnim = st.mergeAnim.filter((p) => p.t < 1);
      for (const p of st.mergeAnim) {
        p.t += 0.03;
        ctx.save();
        ctx.globalAlpha = 1 - p.t;
        ctx.font = mergeFont(p.size);
        ctx.textAlign = 'center';
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y - p.t * 46);
        ctx.restore();
      }
      for (const p of st.pops) {
        p.t += 0.05;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - p.t);
        ctx.strokeStyle = FRUITS[p.lv].pal.mid;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, FRUITS[p.lv].r + p.t * 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      for (let i = st.pops.length - 1; i >= 0; i--) {
        if (st.pops[i].t >= 1) st.pops.splice(i, 1);
      }
      if (st.feverT > 0) {
        ctx.save();
        ctx.strokeStyle = '#f6a817';
        ctx.lineWidth = 2;
        for (const s of FEVER_SPARKS) {
          ctx.globalAlpha = Math.max(0.1, 0.35 + 0.3 * Math.sin(t * 7 + s.phase));
          ctx.beginPath();
          ctx.moveTo(s.x - s.r, s.y);
          ctx.lineTo(s.x + s.r, s.y);
          ctx.moveTo(s.x, s.y - s.r);
          ctx.lineTo(s.x, s.y + s.r);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (!st.over && st.dangerT > DANGER_AFTER_SEC) {
        const remain = Math.max(0, OVER_LIMIT_SEC - st.dangerT).toFixed(1);
        const label = `위험! ${remain}초`;
        ctx.save();
        ctx.font = DANGER_FONT;
        const w = dangerLabelWidth(ctx, label);
        ctx.fillStyle = 'rgba(230,57,70,.93)';
        ctx.beginPath();
        ctx.roundRect(BOARD_W / 2 - w / 2, 168, w, 44, 22);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(label, BOARD_W / 2, 197);
        ctx.restore();
      }
    };

    const loop = (now: number): void => {
      st.raf = requestAnimationFrame(loop);
      const elapsedMs = now - st.last;
      st.last = now;
      const gs = store();
      if (!gs.paused && gs.started) {
        const timing = fixedSteps(elapsedMs, st.physicsRemainderMs);
        st.physicsRemainderMs = timing.remainderMs;
        for (let step = 0; step < timing.steps; step++) {
          Engine.update(engine, STEP_MS);
          if (st.feverT > 0) {
            st.feverT -= STEP_MS / 1000;
            if (st.feverT <= 0) {
              st.feverT = 0;
              store().setFever(false, 0);
              if (!st.over) showToast('피버 종료!');
            } else {
              const left = Math.ceil(st.feverT);
              if (store().feverLeft !== left) store().setFever(true, left);
            }
          }
          if (st.comboTimer > 0) {
            st.comboTimer--;
            if (st.comboTimer === 0) {
              st.combo = 0;
              store().setCombo(0);
            }
          }
        }
        /* 바디 목록은 프레임당 1회만 수집해 오버플로우·렌더가 공유.
           스텝마다 검사하던 것을 프레임 단위로 합침 (1프레임 이내 지연) */
        collectFruitBodies(world, st.bodies);
        if (!st.over) checkOverflow(st.bodies, (timing.steps * STEP_MS) / 1000);
      } else {
        st.physicsRemainderMs = 0;
        collectFruitBodies(world, st.bodies);
      }
      draw(now / 1000, st.bodies);
    };

    /* ---- 입력 (input.ts가 리스너 소유, 판단은 ref 콜백에 위임) ---- */
    const setDropX = (clientX: number): void => {
      st.dropX = clampDropX(clientXToBoard(canvas, clientX), st.current);
    };
    const tap = (): void => {
      if (!store().started) startRef.current();
      else dropRef.current();
    };
    const hide = (): void => {
      if (!st.over && store().started) store().setPaused(true);
    };
    const detachInput = attachGameInput(canvas, {
      isOver: () => store().over,
      setDropX,
      tap,
      nudge: (dir) => nudgeRef.current(dir),
      shake: () => shakeRef.current(),
      restart: () => restartRef.current(),
      togglePause: () => pauseRef.current(),
      hide,
    });
    /* BGM 관련 필드만 바뀌었을 때 sync (점수·콤보 갱신엔 반응하지 않음) */
    const unsubBgm = useGameStore.subscribe((s, prev) => {
      if (
        s.soundOn !== prev.soundOn ||
        s.bgmVolume !== prev.bgmVolume ||
        s.over !== prev.over ||
        s.paused !== prev.paused ||
        s.started !== prev.started ||
        s.danger !== prev.danger ||
        s.feverActive !== prev.feverActive
      ) {
        syncBgm();
      }
    });

    drawNext(st.next);
    st.last = performance.now();
    st.raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(st.raf);
      detachInput();
      unsubBgm();
      Events.off(engine, 'collisionActive', onActive);
      Engine.clear(engine);
      st.toastTimer = clearTimer(st.toastTimer);
      st.dropTimer = clearTimer(st.dropTimer);
      st.shakeTimer = clearTimer(st.shakeTimer);
      st.engine = null;
    };
  }, [drawNext, showToast, sprites]);

  const drop = useCallback(() => {
    const st = g.current;
    const gs = useGameStore.getState();
    if (!st || !st.engine || !st.canDrop || st.over || gs.paused || !gs.started) return;
    st.dropX = clampDropX(st.dropX, st.current);
    const body = createFruitBody(st.dropX, DROP_Y, st.current, DROP_FRICTION);
    Body.setVelocity(body, { x: 0, y: DROP_INITIAL_VY });
    Composite.add(st.engine.world, body);
    st.current = st.next;
    st.dropX = clampDropX(st.dropX, st.current);
    st.next = st.feverT > 0 ? randFeverDrop() : randDrop();
    useGameStore.getState().setNextLv(st.next);
    drawNext(st.next);
    st.canDrop = false;
    st.dropTimer = clearTimer(st.dropTimer);
    st.dropTimer = window.setTimeout(() => {
      st.canDrop = true;
    }, st.feverT > 0 ? FEVER_DROP_COOLDOWN_MS : DROP_COOLDOWN_MS);
    sfx.drop();
    syncBgm(); // 첫 제스처에 오디오 언락 + BGM 시작
  }, [drawNext]);
  const dropRef = useRef(drop);

  /* 박스 흔들기 — 모든 과일에 랜덤 충격을 가해 배치를 뒤섞음. 쿨다운 적용. 피버 중엔 위험 횟수 미소모 + 강화. */
  const shake = useCallback(() => {
    const st = g.current;
    const gs = useGameStore.getState();
    if (!st || !st.engine || st.over || gs.paused || !gs.started || !gs.canShake) return;
    const fever = st.feverT > 0;
    if (st.dangerActive && !fever) {
      if (gs.dangerShakeLeft <= 0) {
        showToast('⚠️ 위험 중 흔들기 소진!');
        sfx.ui();
        return;
      }
      gs.setDangerShakeLeft(gs.dangerShakeLeft - 1);
    }
    if (st.bodies.length === 0) return;
    const power = fever ? FEVER_SHAKE_MULT : 1;
    for (const b of st.bodies) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      Body.setVelocity(b, {
        x: b.velocity.x + dir * (SHAKE_VX_MIN + Math.random() * SHAKE_VX_VAR) * power,
        y: b.velocity.y - (SHAKE_VY_MIN + Math.random() * SHAKE_VY_VAR) * power,
      });
      Body.setAngularVelocity(b, b.angularVelocity + (Math.random() - 0.5) * SHAKE_SPIN * power);
    }
    gs.setCanShake(false);
    st.shakeTimer = clearTimer(st.shakeTimer);
    st.shakeTimer = window.setTimeout(
      () => useGameStore.getState().setCanShake(true),
      fever ? FEVER_SHAKE_COOLDOWN_MS : SHAKE_COOLDOWN_MS,
    );
    const holder = canvasRef.current?.parentElement;
    if (holder) {
      holder.classList.remove('shake');
      void holder.clientWidth; // 애니메이션 리트리거
      holder.classList.add('shake');
      setTimeout(() => holder.classList.remove('shake'), 500);
    }
    sfx.shake();
    showToast('📦 흔들기!');
  }, [showToast]);
  const shakeRef = useRef(shake);

  const start = useCallback(() => {
    const gs = useGameStore.getState();
    if (gs.started || gs.over) return;
    gs.start();
    sfx.ui();
    reshuffleBgm(); // 게임마다 다른 곡
    resetTension(); // 새 게임은 평상시 편곡으로
    syncBgm(); // 시작 제스처에 오디오 언락 + BGM 시작
  }, []);
  const startRef = useRef(start);

  const togglePause = useCallback(() => {
    const gs = useGameStore.getState();
    if (gs.over || !gs.started) return;
    gs.setPaused(!gs.paused);
    sfx.ui();
  }, []);
  const pauseRef = useRef(togglePause);

  const restart = useCallback(() => {
    const game = useGameStore.getState();
    if (game.submittingLeaderboard || (game.over && game.leaderboardStatus === 'loading')) return;
    if (game.over && !game.submittedLeaderboard && game.score > 0) {
      // 등록 없이 다시 시작하면 unknown으로 자동 등록 (재시작은 막지 않음)
      void game.saveLeaderboardScore('unknown', true);
    }
    const st = g.current;
    if (!st) return;
    const eng = st.engine;
    if (eng) {
      Composite.allBodies(eng.world)
        .filter((b) => !b.isStatic)
        .forEach((b) => Composite.remove(eng.world, b));
    }
    resetMutable(st);
    useGameStore.getState().reset(st.next);
    drawNext(st.next);
    sfx.ui();
    reshuffleBgm(); // 게임마다 다른 곡
    resetTension(); // 새 게임은 평상시 편곡으로
    syncBgm(); // 구독에만 의존하지 않고 직접 동기화 (start/drop과 동일)
  }, [drawNext]);
  const restartRef = useRef(restart);

  const nudge = useCallback((dir: -1 | 1) => {
    const st = g.current;
    if (!st) return;
    st.dropX = clampDropX(st.dropX + dir * KEY_MOVE_STEP, st.current);
  }, []);
  const nudgeRef = useRef(nudge);

  const moveLeft = useCallback(() => {
    const st = g.current;
    if (!st) return;
    st.dropX = clampDropX(st.dropX - BUTTON_MOVE_STEP, st.current);
  }, []);
  const moveRight = useCallback(() => {
    const st = g.current;
    if (!st) return;
    st.dropX = clampDropX(st.dropX + BUTTON_MOVE_STEP, st.current);
  }, []);

  useEffect(() => {
    dropRef.current = drop;
    shakeRef.current = shake;
    startRef.current = start;
    pauseRef.current = togglePause;
    restartRef.current = restart;
    nudgeRef.current = nudge;
  }, [drop, shake, start, togglePause, restart, nudge]);

  return {
    canvasRef,
    nextCanvasRef,
    drop,
    restart,
    shake,
    start,
    togglePause,
    moveLeft,
    moveRight,
  };
}
