import { useGameStore } from './store';

export const BGM_VOLUME = 0.32;
const DUCKED_VOLUME = 0.12;
const FADE_IN_MS = 800;
const FADE_OUT_MS = 250;
const DUCK_MS = 600;

let audio: HTMLAudioElement | null = null;
let fadeTimer: number | null = null;

export function ensureBgm(): HTMLAudioElement | null {
  if (!audio && typeof Audio !== 'undefined') {
    audio = new Audio(`${import.meta.env.BASE_URL}bgm.wav`);
    audio.loop = true;
    audio.volume = BGM_VOLUME;
  }
  return audio;
}

function clearFade(): void {
  if (fadeTimer !== null) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }
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
  const { soundOn, over, paused, started } = useGameStore.getState();
  return soundOn && !over && !paused && started;
}

/* 스토어 변경(사운드 토글·게임오버·일시정지 등)에 BGM 재생 상태를 맞춤.
   시작·정지 시 볼륨 페이드로 부드럽게 전환. */
export function syncBgm(): void {
  const a = ensureBgm();
  if (!a) return;
  if (wantPlay() && a.paused) {
    a.volume = 0;
    a.play().catch(() => {});
    fadeTo(BGM_VOLUME, FADE_IN_MS);
  } else if (!wantPlay() && !a.paused) {
    fadeTo(0, FADE_OUT_MS, () => {
      // 페이드 중 상태가 바뀌었으면(다시 재생) 멈추지 않고 복귀
      if (wantPlay()) fadeTo(BGM_VOLUME, FADE_IN_MS / 2);
      else a.pause();
    });
  }
}

/* 큰 이벤트(수박 폭발) 시 BGM을 잠깐 낮췄다가 복구 */
export function duckBgm(): void {
  const a = ensureBgm();
  if (!a || a.paused || !wantPlay()) return;
  a.volume = DUCKED_VOLUME;
  setTimeout(() => {
    const cur = ensureBgm();
    if (cur && !cur.paused && wantPlay()) cur.volume = BGM_VOLUME;
  }, DUCK_MS);
}
