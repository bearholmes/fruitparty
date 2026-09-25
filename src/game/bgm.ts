import { useGameStore } from './store';

export const BGM_VOLUME = 0.32;
const DUCKED_VOLUME = 0.12;
const FADE_IN_MS = 800;
const FADE_OUT_MS = 250;
const DUCK_MS = 600;
const DUCK_RATIO = DUCKED_VOLUME / BGM_VOLUME;

/* HMR로 모듈이 재실행돼도 인스턴스가 늘지 않도록 globalThis에 보관.
   모듈 변수는 재실행마다 초기화되지만 globalThis는 페이지 수명 동안 유지됨. */
const BGM_KEY = '__fruitparty_bgm';

function getBgm(): HTMLAudioElement | null {
  return (globalThis as unknown as Record<string, HTMLAudioElement | null>)[BGM_KEY] ?? null;
}

function setBgm(a: HTMLAudioElement | null): void {
  (globalThis as unknown as Record<string, HTMLAudioElement | null>)[BGM_KEY] = a;
}

let fadeTimer: ReturnType<typeof setInterval> | null = null;
let fadeTarget: number | null = null;
let duckTimer: ReturnType<typeof setTimeout> | null = null;

function selectedVolume(): number {
  return BGM_VOLUME * useGameStore.getState().bgmVolume;
}

export function ensureBgm(): HTMLAudioElement | null {
  const existing = getBgm();
  if (existing) return existing;
  if (typeof Audio === 'undefined') return null;
  const a = new Audio(`${import.meta.env.BASE_URL}bgm.wav`);
  a.loop = true;
  a.volume = selectedVolume();
  setBgm(a);
  return a;
}

function clearFade(): void {
  if (fadeTimer !== null) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }
  fadeTarget = null;
}

function fadeTo(target: number, ms: number, onDone?: () => void): void {
  const a = ensureBgm();
  if (!a) return;
  clearFade();
  const from = a.volume;
  if (from === target) {
    onDone?.();
    return;
  }
  fadeTarget = target;
  const steps = Math.max(1, Math.round(ms / 50));
  let i = 0;
  fadeTimer = setInterval(() => {
    i++;
    a.volume = from + ((target - from) * i) / steps;
    if (i >= steps) {
      clearFade();
      a.volume = target;
      onDone?.();
    }
  }, 50);
}

function wantPlay(): boolean {
  const { soundOn, bgmVolume, over, paused, started } = useGameStore.getState();
  return soundOn && bgmVolume > 0 && !over && !paused && started;
}

/* 스토어 변경(사운드 토글·게임오버·일시정지 등)에 BGM 재생 상태를 맞춤.
   시작·정지 시 볼륨 페이드로 부드럽게 전환. */
export function syncBgm(): void {
  const a = ensureBgm();
  if (!a) return;
  const playing = wantPlay();
  const target = selectedVolume();
  if (playing && a.paused) {
    a.volume = 0;
    a.play().catch(() => {});
    fadeTo(target, FADE_IN_MS);
  } else if (!playing && !a.paused && fadeTarget !== 0) {
    fadeTo(0, FADE_OUT_MS, () => {
      // 페이드 중 상태가 바뀌었으면(다시 재생) 멈추지 않고 복귀
      if (wantPlay()) fadeTo(selectedVolume(), FADE_IN_MS / 2);
      else a.pause();
    });
  } else if (playing && !a.paused) {
    if (fadeTarget !== null && fadeTarget !== target) fadeTo(target, 120);
    else if (fadeTarget === null) a.volume = target * (duckTimer === null ? 1 : DUCK_RATIO);
  }
}

/* 큰 이벤트(수박 폭발) 시 BGM을 잠깐 낮췄다가 복구 */
export function duckBgm(): void {
  const a = ensureBgm();
  if (!a || a.paused || !wantPlay()) return;
  clearFade();
  if (duckTimer !== null) clearTimeout(duckTimer);
  a.volume = selectedVolume() * DUCK_RATIO;
  duckTimer = setTimeout(() => {
    duckTimer = null;
    const cur = ensureBgm();
    if (cur && !cur.paused && wantPlay()) cur.volume = selectedVolume();
  }, DUCK_MS);
}
