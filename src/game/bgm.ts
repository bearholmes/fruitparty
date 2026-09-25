import { useGameStore } from './store';
import { ensureAudioContext } from './sfx';

export const BGM_VOLUME = 0.32;
const DUCKED_VOLUME = 0.12;
const FADE_IN_MS = 800;
const FADE_OUT_MS = 250;
const DUCK_MS = 600;
const DUCK_RATIO = DUCKED_VOLUME / BGM_VOLUME;

/* HMR로 모듈이 재실행돼도 인스턴스가 늘지 않도록 globalThis에 보관.
   모듈 변수는 재실행마다 초기화되지만 globalThis는 페이지 수명 동안 유지됨. */
const BGM_KEY = '__fruitparty_bgm';
const BGM_GRAPH_KEY = '__fruitparty_bgm_graph';

interface BgmGraph {
  source: MediaElementAudioSourceNode;
  gain: GainNode;
}

function getBgm(): HTMLAudioElement | null {
  return (globalThis as unknown as Record<string, HTMLAudioElement | null>)[BGM_KEY] ?? null;
}

function setBgm(a: HTMLAudioElement | null): void {
  (globalThis as unknown as Record<string, HTMLAudioElement | null>)[BGM_KEY] = a;
}

function getGraph(): BgmGraph | null {
  return (globalThis as unknown as Record<string, BgmGraph | null>)[BGM_GRAPH_KEY] ?? null;
}

function ensureGraph(a: HTMLAudioElement): void {
  const existing = getGraph();
  if (existing) {
    const ctx = existing.gain.context as AudioContext;
    if (ctx?.state === 'suspended') void ctx.resume().catch(() => {});
    return;
  }
  const ctx = ensureAudioContext();
  if (!ctx) return;
  try {
    const gain = ctx.createGain();
    gain.gain.value = selectedVolume();
    const source = ctx.createMediaElementSource(a);
    source.connect(gain);
    gain.connect(ctx.destination);
    (globalThis as unknown as Record<string, BgmGraph | null>)[BGM_GRAPH_KEY] = { source, gain };
    try { a.volume = 1; } catch { /* iOS에서는 변경이 막힐 수 있다. */ }
  } catch {
    // Web Audio를 사용할 수 없는 브라우저는 오디오 요소의 음량을 쓴다.
  }
}

function outputVolume(a: HTMLAudioElement): number {
  return getGraph()?.gain.gain.value ?? a.volume;
}

function setOutputVolume(a: HTMLAudioElement, value: number): void {
  const graph = getGraph();
  if (graph) graph.gain.gain.value = value;
  else {
    try { a.volume = value; } catch { /* Web Audio를 지원하지 않는 기기의 대체 경로 */ }
  }
}

let fadeTimer: ReturnType<typeof setInterval> | null = null;
let fadeTarget: number | null = null;
let duckTimer: ReturnType<typeof setTimeout> | null = null;
let previewTimer: ReturnType<typeof setTimeout> | null = null;

function selectedVolume(): number {
  return BGM_VOLUME * useGameStore.getState().bgmVolume;
}

export function ensureBgm(): HTMLAudioElement | null {
  const existing = getBgm();
  if (existing) {
    ensureGraph(existing);
    return existing;
  }
  if (typeof Audio === 'undefined') return null;
  const a = new Audio(`${import.meta.env.BASE_URL}bgm.wav`);
  a.loop = true;
  setBgm(a);
  ensureGraph(a);
  if (!getGraph()) setOutputVolume(a, selectedVolume());
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
  const from = outputVolume(a);
  if (from === target) {
    onDone?.();
    return;
  }
  fadeTarget = target;
  const steps = Math.max(1, Math.round(ms / 50));
  let i = 0;
  fadeTimer = setInterval(() => {
    i++;
    setOutputVolume(a, from + ((target - from) * i) / steps);
    if (i >= steps) {
      clearFade();
      setOutputVolume(a, target);
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
    setOutputVolume(a, 0);
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
    else if (fadeTarget === null) setOutputVolume(a, target * (duckTimer === null ? 1 : DUCK_RATIO));
  }
}

export function previewBgm(): void {
  if (previewTimer !== null) clearTimeout(previewTimer);
  previewTimer = null;
  if (!useGameStore.getState().soundOn || selectedVolume() === 0) return;
  const a = ensureBgm();
  if (!a) return;
  clearFade();
  setOutputVolume(a, selectedVolume());
  if (a.paused) void a.play().catch(() => {});
  previewTimer = setTimeout(() => {
    previewTimer = null;
    if (!wantPlay()) fadeTo(0, FADE_OUT_MS, () => {
      if (!wantPlay()) a.pause();
    });
  }, 900);
}

/* 큰 이벤트(수박 폭발) 시 BGM을 잠깐 낮췄다가 복구 */
export function duckBgm(): void {
  const a = ensureBgm();
  if (!a || a.paused || !wantPlay()) return;
  clearFade();
  if (duckTimer !== null) clearTimeout(duckTimer);
  setOutputVolume(a, selectedVolume() * DUCK_RATIO);
  duckTimer = setTimeout(() => {
    duckTimer = null;
    const cur = ensureBgm();
    if (cur && !cur.paused && wantPlay()) setOutputVolume(cur, selectedVolume());
  }, DUCK_MS);
}
