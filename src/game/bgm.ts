/* 절차적 BGM — 3개 곡을 오실레이터로 합성해 게임마다 랜덤 재생.
   파일 루프 대신 코드 작곡: 무한 재생 + 위험 시 텐션 편곡·피버 시 고조 편곡으로 전환.
   곡 데이터는 ./audio/tracks, 신스는 ./audio/synth, 믹싱값은 ./config/audio */

import { useGameStore } from './store';
import { ensureAudioContext } from './audio/context';
import { playTone, playNoise } from './audio/synth';
import { BGM_TRACKS, type BgmTrack } from './audio/tracks';
import {
  BGM_VOLUME,
  DUCKED_VOLUME,
  FADE_IN_MS,
  FADE_OUT_MS,
  DUCK_MS,
  PREVIEW_MS,
  TENSION_RELEASE_SEC,
  SCHED_INTERVAL_MS,
  LOOKAHEAD_SEC,
  STEPS_PER_BAR,
  BAR_COUNT,
  SKANK_VOL,
  ARP_VOL,
  ARP_TENSE_VOL,
  BASS_VOL,
  HAT_VOL,
  HAT_SOFT_VOL,
  LEAD_VOL,
  LEAD_SQ_VOL,
  LEAD_OCT_VOL,
  KICK_VOL,
  SNARE_VOL,
  SNARE_TENSE_VOL,
} from './config/audio';

export { BGM_TRACKS, type BgmTrack, type BgmChord } from './audio/tracks';
export { BGM_VOLUME, PREVIEW_MS, TENSION_RELEASE_SEC } from './config/audio';

const DUCK_RATIO = DUCKED_VOLUME / BGM_VOLUME;

export function midiFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

interface BgmPlayer {
  ctx: AudioContext;
  master: GainNode;
  timer: ReturnType<typeof setInterval> | null;
  playing: boolean;
  step: number;
  nextTime: number;
  track: number;
  pending: number | null;
  tense: boolean;
  fever: boolean;
}

/* HMR로 모듈이 재실행돼도 인스턴스가 늘지 않도록 globalThis에 보관.
   모듈 변수는 재실행마다 초기화되지만 globalThis는 페이지 수명 동안 유지됨. */
const BGM_KEY = '__fruitparty_bgm_player';

function getPlayer(): BgmPlayer | null {
  return (globalThis as unknown as Record<string, BgmPlayer | null>)[BGM_KEY] ?? null;
}

function setPlayer(p: BgmPlayer | null): void {
  (globalThis as unknown as Record<string, BgmPlayer | null>)[BGM_KEY] = p;
}

let fadeTimer: ReturnType<typeof setInterval> | null = null;
let fadeTarget: number | null = null;
let duckTimer: ReturnType<typeof setTimeout> | null = null;
let previewTimer: ReturnType<typeof setTimeout> | null = null;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;

function selectedVolume(): number {
  return BGM_VOLUME * useGameStore.getState().bgmVolume;
}

export function ensureBgm(): BgmPlayer | null {
  const existing = getPlayer();
  if (existing) return existing;
  const ctx = ensureAudioContext();
  if (!ctx) return null;
  try {
    const master = ctx.createGain();
    master.gain.value = selectedVolume();
    master.connect(ctx.destination);
    const p: BgmPlayer = {
      ctx,
      master,
      timer: null,
      playing: false,
      step: 0,
      nextTime: 0,
      track: Math.floor(Math.random() * BGM_TRACKS.length),
      pending: null,
      tense: false,
      fever: false,
    };
    setPlayer(p);
    return p;
  } catch {
    return null;
  }
}

function outputVolume(p: BgmPlayer): number {
  return p.master.gain.value;
}

function setOutputVolume(p: BgmPlayer, value: number): void {
  p.master.gain.value = value;
}

function clearFade(): void {
  if (fadeTimer !== null) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }
  fadeTarget = null;
}

function fadeTo(target: number, ms: number, onDone?: () => void): void {
  const p = ensureBgm();
  if (!p) return;
  clearFade();
  const from = outputVolume(p);
  if (from === target) {
    onDone?.();
    return;
  }
  fadeTarget = target;
  const steps = Math.max(1, Math.round(ms / 50));
  let i = 0;
  fadeTimer = setInterval(() => {
    i++;
    setOutputVolume(p, from + ((target - from) * i) / steps);
    if (i >= steps) {
      clearFade();
      setOutputVolume(p, target);
      onDone?.();
    }
  }, 50);
}

function toneAt(
  p: BgmPlayer,
  freq: number,
  t0: number,
  dur: number,
  vol: number,
  type: OscillatorType,
  attack = 0.02,
  freqEnd?: number,
): void {
  playTone(p.ctx, p.master, { freq, freqEnd, type, dur, vol, attack, at: t0 });
}

function noiseHit(
  p: BgmPlayer,
  t0: number,
  dur: number,
  vol: number,
  type: BiquadFilterType,
  filterFreq: number,
): void {
  playNoise(p.ctx, p.master, {
    dur,
    vol,
    filterType: type,
    filterFreq,
    attack: 0.005,
    at: t0,
  });
}

function kickAt(p: BgmPlayer, t0: number): void {
  playTone(p.ctx, p.master, {
    freq: 160,
    freqEnd: 45,
    type: 'sine',
    dur: 0.12,
    vol: KICK_VOL,
    attack: 0.005,
    at: t0,
  });
}

function snareAt(p: BgmPlayer, t0: number, tense: boolean): void {
  noiseHit(p, t0, 0.09, tense ? SNARE_TENSE_VOL : SNARE_VOL, 'bandpass', 1800);
  toneAt(p, 190, t0, 0.08, 0.03, 'triangle');
}

function stepDur(track: BgmTrack, tense = false, fever = false): number {
  return (60 / track.bpm / 4) * (fever ? 0.7 : tense ? 0.8 : 1);
}

/* 16분음 그리드 한 스텝 예약. 텐션·피버 모드에선 아르페지오가 16분음으로 촘촘해지고
   베이스 펄스+하이햇이 붙는다. 피버에선 템포가 더 빨라지고 리드가 한 옥타브 올라간다.
   곡 교체(pending)는 마디 경계에서만 적용. */
function scheduleStep(p: BgmPlayer, step: number, t: number): void {
  if (step % STEPS_PER_BAR === 0 && p.pending !== null) {
    p.track = p.pending;
    p.pending = null;
  }
  const track = BGM_TRACKS[p.track];
  const chord = track.bars[Math.floor(step / STEPS_PER_BAR) % BAR_COUNT];
  const s16 = step % STEPS_PER_BAR;
  const sd = stepDur(track, p.tense, p.fever);
  const hot = p.tense || p.fever;
  const tones = [chord.tones[0], chord.tones[1], chord.tones[2], chord.tones[0] + 12];
  // 크래시: 루프 시작, 고조 상태에선 매 마디
  if (step % (STEPS_PER_BAR * BAR_COUNT) === 0 || (hot && s16 === 0)) {
    noiseHit(p, t, 0.3, 0.06, 'highpass', 5000);
  }
  // 베이스 그루브: 8분음 파운딩 (서브가 아닌 멜로딕 음역)
  if (s16 % 2 === 0) {
    const b = chord.bass + 12 + track.groove[Math.floor(s16 / 2)];
    toneAt(p, midiFreq(b), t, sd * 1.6, BASS_VOL, 'triangle', 0.01);
  }
  // 스캥크: 오프비트 코드 (고조 상태에선 8분음)
  if (hot ? s16 % 2 === 0 : s16 % 4 === 2) {
    for (const m of chord.tones) toneAt(p, midiFreq(m + 12), t, sd * 1.2, SKANK_VOL, 'triangle');
  }
  if (hot || s16 % 2 === 0) {
    const m = tones[track.arp[s16]] + (hot ? 12 : 0);
    toneAt(p, midiFreq(m), t, sd * 1.8, hot ? ARP_TENSE_VOL : ARP_VOL, 'triangle');
  }
  if (s16 % 2 === 0) {
    const m = track.lead[Math.floor(step / 2) % (BAR_COUNT * 8)];
    if (m !== null) {
      const lm = m + (p.fever ? 12 : 0);
      toneAt(p, midiFreq(lm), t, sd * 2.2, LEAD_VOL, 'triangle');
      toneAt(p, midiFreq(lm), t, sd * 2.2, LEAD_SQ_VOL, 'square');
      toneAt(p, midiFreq(lm + 12), t, sd * 2.2, LEAD_OCT_VOL, 'sine');
    }
  }
  if (s16 % 4 === 0) kickAt(p, t);
  if (s16 === 4 || s16 === 12) snareAt(p, t, hot);
  if (hot || s16 % 2 === 0) {
    noiseHit(p, t, 0.04, hot ? HAT_VOL : HAT_SOFT_VOL, 'highpass', 7000);
  }
}

function tick(): void {
  const p = getPlayer();
  if (!p || !p.playing) return;
  if (p.ctx.state === 'suspended') {
    void p.ctx.resume().catch(() => {});
    return;
  }
  const t0 = p.ctx.currentTime;
  if (p.nextTime < t0 - 0.1) p.nextTime = t0 + 0.05; // 오래 멈췄다 복귀하면 재동기화
  while (p.nextTime < t0 + LOOKAHEAD_SEC) {
    scheduleStep(p, p.step, p.nextTime);
    p.nextTime += stepDur(BGM_TRACKS[p.track], p.tense, p.fever);
    p.step++;
  }
}

function startScheduler(p: BgmPlayer): void {
  if (p.pending !== null) {
    p.track = p.pending;
    p.pending = null;
  }
  if (p.ctx.state === 'suspended') {
    // 제스처 직후 호출되는 경우가 많아 여기서 깨우면 즉시 재생된다.
    // 실패해도 tick이 100ms마다 재시도하므로 안전망은 유지됨.
    void p.ctx.resume().catch(() => {});
  }
  if (p.timer !== null) {
    p.playing = true;
    return;
  }
  p.step = 0;
  p.nextTime = p.ctx.currentTime + 0.05;
  p.playing = true;
  p.timer = setInterval(tick, SCHED_INTERVAL_MS);
  tick(); // 100ms 공백 없이 바로 예약
}

function stopScheduler(p: BgmPlayer): void {
  p.playing = false;
  if (p.timer !== null) {
    clearInterval(p.timer);
    p.timer = null;
  }
}

function wantPlay(): boolean {
  const { soundOn, bgmVolume, over, paused, started } = useGameStore.getState();
  return soundOn && bgmVolume > 0 && !over && !paused && started;
}

/* 위험 진입 경보음 — 상승 블립 2회 */
function stinger(p: BgmPlayer): void {
  const t = p.ctx.currentTime + 0.02;
  toneAt(p, 660, t, 0.12, 0.12, 'square', 0.01, 990);
  toneAt(p, 660, t + 0.16, 0.12, 0.12, 'square', 0.01, 990);
}

/* 위험 상태에선 텐션 편곡으로 즉시 전환, 해제 후엔 일정 시간 뒤에 복귀 */
function updateTension(p: BgmPlayer): void {
  if (useGameStore.getState().danger) {
    if (releaseTimer !== null) {
      clearTimeout(releaseTimer);
      releaseTimer = null;
    }
    if (!p.tense && p.playing) stinger(p);
    p.tense = true;
    return;
  }
  if (p.tense && releaseTimer === null) {
    releaseTimer = setTimeout(() => {
      releaseTimer = null;
      const cur = getPlayer();
      if (cur) cur.tense = false;
    }, TENSION_RELEASE_SEC * 1000);
  }
}

/* 피버 진입·종료는 스토어 구독으로 syncBgm이 자동 호출되므로 플래그만 맞춘다 */
function updateFever(p: BgmPlayer): void {
  p.fever = useGameStore.getState().feverActive;
}

/* 스토어 변경(사운드 토글·게임오버·일시정지 등)에 BGM 재생 상태를 맞춤.
   시작·정지 시 볼륨 페이드로 부드럽게 전환. */
export function syncBgm(): void {
  const p = ensureBgm();
  if (!p) return;
  updateTension(p);
  updateFever(p);
  const playing = wantPlay();
  const target = selectedVolume();
  if (playing && !p.playing) {
    setOutputVolume(p, 0);
    startScheduler(p);
    fadeTo(target, FADE_IN_MS);
  } else if (!playing && p.playing && fadeTarget !== 0) {
    fadeTo(0, FADE_OUT_MS, () => {
      // 페이드 중 상태가 바뀌었으면(다시 재생) 멈추지 않고 복귀
      if (wantPlay()) fadeTo(selectedVolume(), FADE_IN_MS / 2);
      else stopScheduler(p);
    });
  } else if (playing && p.playing) {
    if (fadeTarget !== null && fadeTarget !== target) fadeTo(target, 120);
    else if (fadeTarget === null) setOutputVolume(p, target * (duckTimer === null ? 1 : DUCK_RATIO));
  }
}

/* 새 게임 시작 시 텐션 상태 초기화 (위험 편곡이 다음 판까지 이어지지 않게) */
export function resetTension(): void {
  if (releaseTimer !== null) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  const p = getPlayer();
  if (p) p.tense = false;
}

/* 다른 곡으로 교체. 재생 중이면 다음 마디 경계에서 자연스럽게 전환. 선택된 곡 번호 반환 */
export function reshuffleBgm(): number {
  const p = ensureBgm();
  const cur = p?.pending ?? p?.track ?? -1;
  let idx = Math.floor(Math.random() * BGM_TRACKS.length);
  if (BGM_TRACKS.length > 1 && idx === cur) idx = (idx + 1) % BGM_TRACKS.length;
  if (p) {
    if (p.playing) p.pending = idx;
    else {
      p.track = idx;
      p.pending = null;
    }
  }
  return idx;
}

/* 일시정지 메뉴에서 현재 음량을 잠시 들려주고, 게임 중이 아니면 다시 멈춤 */
export function previewBgm(): void {
  if (previewTimer !== null) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }
  if (!useGameStore.getState().soundOn || selectedVolume() === 0) return;
  const p = ensureBgm();
  if (!p) return;
  clearFade();
  setOutputVolume(p, selectedVolume());
  if (!p.playing) startScheduler(p);
  previewTimer = setTimeout(() => {
    previewTimer = null;
    syncBgm(); // 게임 중이면 유지, 아니면 페이드아웃 후 정지
  }, PREVIEW_MS);
}

/* 큰 이벤트(단감 폭발) 시 BGM을 잠깐 낮췄다가 복구 */
export function duckBgm(): void {
  const p = ensureBgm();
  if (!p || !p.playing || !wantPlay()) return;
  clearFade();
  if (duckTimer !== null) clearTimeout(duckTimer);
  setOutputVolume(p, selectedVolume() * DUCK_RATIO);
  duckTimer = setTimeout(() => {
    duckTimer = null;
    const cur = ensureBgm();
    if (cur && cur.playing && wantPlay()) setOutputVolume(cur, selectedVolume());
  }, DUCK_MS);
}
