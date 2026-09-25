import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Engine, Bodies, Body, Events, Composite } from 'matter-js';
import { FRUITS, MAX_LEVEL, loadSprites, makeSprites, randDrop } from './art';
import { useGameStore } from './store';
import { syncBgm, duckBgm } from './bgm';
import { sfx } from './sfx';
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
} from './constants';

/** 과일 식별용 커스텀 필드를 단 Matter 바디 */
type FruitBody = Body & { fruitLevel?: number; merged?: boolean };

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
  dangerT: number;
  dangerActive: boolean;
  dangerClearT: number;
  mergeAnim: MergeAnim[];
  pops: PopFx[];
  raf: number;
  last: number;
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
    dangerT: 0,
    dangerActive: false,
    dangerClearT: 0,
    mergeAnim: [],
    pops: [],
    raf: 0,
    last: 0,
    toastTimer: null,
    dropTimer: null,
    shakeTimer: null,
  };
}

function clearTimer(t: number | null): null {
  if (t !== null) clearTimeout(t);
  return null;
}

/** 콤보가 높을수록 합체 점수 텍스트를 크게·뜨겁게 */
function comboStyle(combo: number): { size: number; color: string } {
  return {
    size: Math.min(34, 20 + combo * 2),
    color: combo >= 6 ? '#e63946' : combo >= 3 ? '#ff6b35' : '#3d2b1f',
  };
}

const COMBO_MILESTONES = new Set([3, 5, 8, 12, 20]);

/* 수박게임 엔진 훅 — Matter 물리 + 스프라이트 렌더.
   UI 상태는 zustand 스토어가 소유, 루프·충돌 콜백에선 getState()로 접근.
   반환은 canvas ref와 액션만 (점수 등은 App에서 스토어 셀렉터로 구독). */
export function useSuika() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sprites = useMemo(() => (typeof document === 'undefined' ? [] : makeSprites()), []);

  const g = useRef<MutableGame | null>(null);
  if (!g.current) g.current = createMutable();

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
      const c = cv.getContext('2d');
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
    let active = true;
    loadSprites(sprites)
      .then(() => {
        if (!active) return;
        useGameStore.getState().setEvoUrls(sprites.map((s) => s.cv.toDataURL()));
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
    engine.gravity.y = 1.05;
    st.engine = engine;
    const world = engine.world;

    const opt = { isStatic: true, friction: 0.4, restitution: 0 };
    Composite.add(world, [
      Bodies.rectangle(BOARD_W / 2, BOARD_H - WALL / 2 + 8, BOARD_W, WALL + 16, opt),
      Bodies.rectangle(WALL / 2 - 8, BOARD_H / 2, WALL + 16, BOARD_H, opt),
      Bodies.rectangle(BOARD_W - WALL / 2 + 8, BOARD_H / 2, WALL + 16, BOARD_H, opt),
    ]);

    const pop = (x: number, y: number, lv: number): void => {
      st.pops.push({ x, y, lv, t: 0 });
    };

    const pulseCombo = (combo: number): void => {
      if (!COMBO_MILESTONES.has(combo)) return;
      showToast(`🔥 콤보 x${combo}!`);
      const holder = canvasRef.current?.parentElement;
      if (!holder) return;
      holder.classList.remove('combo-flash');
      void holder.clientWidth; // 애니메이션 리트리거
      holder.classList.add('combo-flash');
      setTimeout(() => holder.classList.remove('combo-flash'), 350);
    };

    const onCollide = (e: CollisionEvent): void => {
      if (st.over || store().paused) return;
      for (const pair of e.pairs) {
        const a = pair.bodyA as FruitBody;
        const b = pair.bodyB as FruitBody;
        if (a.fruitLevel === undefined || b.fruitLevel === undefined) continue;
        if (a.fruitLevel !== b.fruitLevel) continue;
        if (a.merged || b.merged) continue;
        const lv = a.fruitLevel;
        a.merged = b.merged = true;
        const mx = (a.position.x + b.position.x) / 2;
        const my = (a.position.y + b.position.y) / 2;
        Composite.remove(world, a);
        Composite.remove(world, b);
        st.overTime.delete(a.id);
        st.overTime.delete(b.id);
        if (lv === MAX_LEVEL) {
          store().addScore(FINAL_BONUS);
          st.mergeAnim.push({
            x: mx,
            y: my,
            t: 0,
            text: `+${FINAL_BONUS}`,
            size: 30,
            color: '#e63946',
          });
          pop(mx, my, lv);
          showToast(`💥 단감 폭발! +${FINAL_BONUS}`);
          st.combo++;
          store().setCombo(st.combo);
          st.comboTimer = COMBO_WINDOW_FRAMES;
          pulseCombo(st.combo);
          sfx.explosion();
          duckBgm();
          continue;
        }
        const nl = lv + 1;
        const body = Bodies.circle(mx, Math.min(my, BOARD_H - 120), FRUITS[nl].r, {
          restitution: 0.25,
          friction: 0.45,
          frictionAir: 0.008,
          density: 0.0012 + nl * 0.00025,
        }) as FruitBody;
        Body.scale(body, FRUITS[nl].hitbox.x, FRUITS[nl].hitbox.y);
        body.fruitLevel = nl;
        Composite.add(world, body);
        pop(mx, my, nl);
        const pts = Math.round(FRUITS[nl].score * (1 + st.combo * 0.5));
        store().addScore(pts);
        st.combo++;
        store().setCombo(st.combo);
        st.comboTimer = COMBO_WINDOW_FRAMES;
        st.mergeAnim.push({ x: mx, y: my, t: 0, text: `+${pts}`, ...comboStyle(st.combo) });
        sfx.merge(nl, st.combo);
        if (nl >= EVO_TOAST_MIN_LEVEL) showToast(`🎉 ${FRUITS[nl].name} 탄생!`);
        pulseCombo(st.combo);
      }
    };
    Events.on(engine, 'collisionStart', onCollide);

    const drawFruit = (x: number, y: number, lv: number, angle = 0, ghost = false): void => {
      const s = sprites[lv];
      ctx.save();
      ctx.globalAlpha = ghost ? 0.92 : 1;
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.drawImage(s.cv, -s.cx, -s.cy - FRUITS[lv].r * FRUITS[lv].artOffsetY, s.S, s.S);
      ctx.restore();
    };

    const checkOverflow = (dt: number): void => {
      const bodies = Composite.allBodies(world).filter(
        (b) => !b.isStatic && (b as FruitBody).fruitLevel !== undefined,
      );
      let maxT = 0;
      for (const b of bodies) {
        const lv = (b as FruitBody).fruitLevel ?? 0;
        if (
          b.position.y - FRUITS[lv].r * FRUITS[lv].hitbox.y < DEADLINE_Y &&
          Math.abs(b.velocity.y) < 0.35
        ) {
          const t = (st.overTime.get(b.id) ?? 0) + dt;
          st.overTime.set(b.id, t);
          maxT = Math.max(maxT, t);
          if (t > OVER_LIMIT_SEC) {
            st.over = true;
            store().gameOver();
            sfx.gameOver();
            if (store().isRecord) setTimeout(() => sfx.fanfare(), 700);
            return;
          }
        } else {
          st.overTime.set(b.id, 0);
        }
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

    const draw = (t: number): void => {
      ctx.clearRect(0, 0, BOARD_W, BOARD_H);
      ctx.fillStyle = '#eef5e9';
      ctx.fillRect(0, 0, BOARD_W, BOARD_H);
      ctx.fillStyle = '#376f55';
      ctx.fillRect(0, 0, WALL, BOARD_H);
      ctx.fillRect(BOARD_W - WALL, 0, WALL, BOARD_H);
      ctx.fillRect(0, BOARD_H - WALL, BOARD_W, WALL);
      ctx.fillStyle = '#75a384';
      for (let y = 10; y < BOARD_H; y += 26) {
        ctx.fillRect(4, y, 6, 12);
        ctx.fillRect(BOARD_W - 10, y, 6, 12);
      }

      const danger = [...st.overTime.values()].some((v) => v > DANGER_AFTER_SEC);
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
        drawFruit(st.dropX, DROP_Y, st.current, 0, true);
      }

      for (const b of Composite.allBodies(world)) {
        const lv = (b as FruitBody).fruitLevel;
        if (lv === undefined || b.isStatic) continue;
        drawFruit(b.position.x, b.position.y, lv, b.angle, false);
      }

      st.mergeAnim = st.mergeAnim.filter((p) => p.t < 1);
      for (const p of st.mergeAnim) {
        p.t += 0.03;
        ctx.save();
        ctx.globalAlpha = 1 - p.t;
        ctx.font = `800 ${p.size}px Roboto, Pretendard, sans-serif`;
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

      if (!st.over && st.dangerT > DANGER_AFTER_SEC) {
        const remain = Math.max(0, OVER_LIMIT_SEC - st.dangerT).toFixed(1);
        const label = `위험! ${remain}초`;
        ctx.save();
        ctx.font = '800 26px Roboto, Pretendard, sans-serif';
        const w = ctx.measureText(label).width + 36;
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
      const dt = Math.min((now - st.last) / 1000, 0.033);
      st.last = now;
      const gs = store();
      if (!gs.paused && gs.started) {
        Engine.update(engine, 1000 / 60);
        if (!st.over) checkOverflow(dt);
        if (st.comboTimer > 0) {
          st.comboTimer--;
          if (st.comboTimer === 0) {
            st.combo = 0;
            store().setCombo(0);
          }
        }
      }
      draw(now / 1000);
    };

    /* ---- 입력 ---- */
    const setX = (clientX: number): void => {
      const r = canvas.getBoundingClientRect();
      const px = ((clientX - r.left) / r.width) * BOARD_W;
      st.dropX = Math.max(
        WALL + FRUITS[st.current].r * FRUITS[st.current].hitbox.x,
        Math.min(BOARD_W - WALL - FRUITS[st.current].r * FRUITS[st.current].hitbox.x, px),
      );
    };
    const onMove = (e: MouseEvent): void => {
      setX(e.clientX);
    };
    const onDown = (e: MouseEvent): void => {
      if (!store().started) {
        startRef.current();
        return;
      }
      setX(e.clientX);
      dropRef.current();
    };
    const onTouchStart = (e: TouchEvent): void => {
      const t = e.touches[0];
      if (t) setX(t.clientX);
    };
    const onTouchMove = (e: TouchEvent): void => {
      const t = e.touches[0];
      if (t) setX(t.clientX);
      e.preventDefault();
    };
    const onTouchEnd = (): void => {
      if (!store().started) startRef.current();
      else dropRef.current();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable="true"]')) return;
      const step = 14;
      if (
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight' ||
        e.code === 'ArrowUp' ||
        e.code === 'ArrowDown' ||
        e.code === 'Space'
      )
        e.preventDefault();
      if (e.code === 'ArrowLeft')
        st.dropX = Math.max(
          WALL + FRUITS[st.current].r * FRUITS[st.current].hitbox.x,
          st.dropX - step,
        );
      if (e.code === 'ArrowRight')
        st.dropX = Math.min(
          BOARD_W - WALL - FRUITS[st.current].r * FRUITS[st.current].hitbox.x,
          st.dropX + step,
        );
      if (e.code === 'Space' || e.key === 'Enter') {
        (document.activeElement as HTMLElement | null)?.blur?.();
        if (!store().started) startRef.current();
        else dropRef.current();
      }
      if (e.key === 'r' || e.key === 'R') restartRef.current();
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'KeyS') shakeRef.current();
      if (e.code === 'KeyP' || e.code === 'Escape') pauseRef.current();
    };
    const onVis = (): void => {
      if (document.hidden && !st.over && store().started) store().setPaused(true);
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVis);
    const unsubBgm = useGameStore.subscribe(syncBgm);

    drawNext(st.next);
    st.last = performance.now();
    st.raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(st.raf);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVis);
      unsubBgm();
      Events.off(engine, 'collisionStart', onCollide);
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
    const body = Bodies.circle(st.dropX, DROP_Y, FRUITS[st.current].r, {
      restitution: 0.2,
      friction: 0.5,
      frictionAir: 0.008,
      density: 0.0012 + st.current * 0.00025,
    }) as FruitBody;
    Body.scale(body, FRUITS[st.current].hitbox.x, FRUITS[st.current].hitbox.y);
    body.fruitLevel = st.current;
    Body.setVelocity(body, { x: 0, y: 2 });
    Composite.add(st.engine.world, body);
    st.current = st.next;
    st.next = randDrop();
    useGameStore.getState().setNextLv(st.next);
    drawNext(st.next);
    st.canDrop = false;
    st.dropTimer = clearTimer(st.dropTimer);
    st.dropTimer = window.setTimeout(() => {
      st.canDrop = true;
    }, DROP_COOLDOWN_MS);
    sfx.drop();
    syncBgm(); // 첫 제스처에 오디오 언락 + BGM 시작
  }, [drawNext]);
  const dropRef = useRef(drop);
  dropRef.current = drop;

  /* 박스 흔들기 — 모든 과일에 랜덤 충격을 가해 배치를 뒤섞음. 쿨다운 적용. */
  const shake = useCallback(() => {
    const st = g.current;
    const gs = useGameStore.getState();
    if (!st || !st.engine || st.over || gs.paused || !gs.started || !gs.canShake) return;
    if (st.dangerActive) {
      if (gs.dangerShakeLeft <= 0) {
        showToast('⚠️ 위험 중 흔들기 소진!');
        sfx.ui();
        return;
      }
      gs.setDangerShakeLeft(gs.dangerShakeLeft - 1);
    }
    const bodies = Composite.allBodies(st.engine.world).filter(
      (b) => !b.isStatic && (b as FruitBody).fruitLevel !== undefined,
    );
    if (bodies.length === 0) return;
    for (const b of bodies) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      Body.setVelocity(b, {
        x: b.velocity.x + dir * (2.5 + Math.random() * 3.5),
        y: b.velocity.y - (1 + Math.random() * 2.5),
      });
      Body.setAngularVelocity(b, b.angularVelocity + (Math.random() - 0.5) * 0.4);
    }
    gs.setCanShake(false);
    st.shakeTimer = clearTimer(st.shakeTimer);
    st.shakeTimer = window.setTimeout(() => useGameStore.getState().setCanShake(true), SHAKE_COOLDOWN_MS);
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
  shakeRef.current = shake;

  const start = useCallback(() => {
    const gs = useGameStore.getState();
    if (gs.started || gs.over) return;
    gs.start();
    sfx.ui();
    syncBgm(); // 시작 제스처에 오디오 언락 + BGM 시작
  }, []);
  const startRef = useRef(start);
  startRef.current = start;

  const togglePause = useCallback(() => {
    const gs = useGameStore.getState();
    if (gs.over || !gs.started) return;
    gs.setPaused(!gs.paused);
    sfx.ui();
  }, []);
  const pauseRef = useRef(togglePause);
  pauseRef.current = togglePause;

  const restart = useCallback(() => {
    const game = useGameStore.getState();
    if (game.over && (game.pendingLeaderboard || game.leaderboardStatus !== 'ready')) return;
    const st = g.current;
    if (!st) return;
    const eng = st.engine;
    if (eng) {
      Composite.allBodies(eng.world)
        .filter((b) => !b.isStatic)
        .forEach((b) => Composite.remove(eng.world, b));
    }
    st.combo = 0;
    st.comboTimer = 0;
    st.over = false;
    st.canDrop = true;
    st.overTime.clear();
    st.dangerT = 0;
    st.dangerActive = false;
    st.dangerClearT = 0;
    st.mergeAnim = [];
    st.pops = [];
    st.dropTimer = clearTimer(st.dropTimer);
    st.shakeTimer = clearTimer(st.shakeTimer);
    st.current = randDrop();
    st.next = randDrop();
    useGameStore.getState().reset(st.next);
    drawNext(st.next);
    sfx.ui();
  }, [drawNext]);
  const restartRef = useRef(restart);
  restartRef.current = restart;

  const moveLeft = useCallback(() => {
    const st = g.current;
    if (!st) return;
    st.dropX = Math.max(WALL + 20, st.dropX - 24);
  }, []);
  const moveRight = useCallback(() => {
    const st = g.current;
    if (!st) return;
    st.dropX = Math.min(BOARD_W - WALL - 20, st.dropX + 24);
  }, []);

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
