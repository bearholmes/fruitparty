/* 절차적 BGM — 3개 곡을 오실레이터로 합성해 게임마다 랜덤 재생.
   파일 루프 대신 코드 작곡: 무한 재생 + 위험 시 텐션 편곡으로 전환.
   sfx.ts와 같은 Web Audio 합성 방식을 쓴다 (에셋 없음). */

import { useGameStore } from './store';
import { ensureAudioContext } from './sfx';

export const BGM_VOLUME = 1.0;
const DUCKED_VOLUME = 0.12;
const FADE_IN_MS = 800;
const FADE_OUT_MS = 250;
const DUCK_MS = 600;
const DUCK_RATIO = DUCKED_VOLUME / BGM_VOLUME;
/** 일시정지 메뉴 미리듣기 재생 시간 */
export const PREVIEW_MS = 900;
/** 위험 해제 후 텐션 편곡을 유지하는 시간 */
export const TENSION_RELEASE_SEC = 4;

const SCHED_INTERVAL_MS = 100;
const LOOKAHEAD_SEC = 0.35;
const STEPS_PER_BAR = 16; // 16분음 그리드
const BAR_COUNT = 4;

const SKANK_VOL = 0.06;
const ARP_VOL = 0.06;
const ARP_TENSE_VOL = 0.09;
const BASS_VOL = 0.1;
const HAT_VOL = 0.025;
const HAT_SOFT_VOL = 0.018;
const LEAD_VOL = 0.09;
const LEAD_SQ_VOL = 0.03;
const LEAD_OCT_VOL = 0.035;
const KICK_VOL = 0.14;
const SNARE_VOL = 0.07;
const SNARE_TENSE_VOL = 0.09;

export function midiFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export interface BgmChord {
  /** 3화음 (midi) */
  tones: [number, number, number];
  /** 베이스 (midi) */
  bass: number;
}

export interface BgmTrack {
  name: string;
  bpm: number;
  bars: [BgmChord, BgmChord, BgmChord, BgmChord];
  /** 16스텝 아르페지오 (화음톤 0~2 + 옥타브업 3). 평상시엔 짝수 스텝만 연주 */
  arp: number[];
  /** 리드 멜로디 (8분음 × 4마디 = 32슬롯, midi·null=쉼표) */
  lead: (number | null)[];
  /** 베이스 그루브 (8분음 8슬롯, 코드 베이스 기준 반음 오프셋) */
  groove: number[];
}

export const BGM_TRACKS: BgmTrack[] = [
  {
    name: '아침 산책',
    bpm: 124,
    bars: [
      { tones: [60, 64, 67], bass: 36 },
      { tones: [55, 59, 62], bass: 31 },
      { tones: [57, 60, 64], bass: 33 },
      { tones: [53, 57, 60], bass: 29 },
    ],
    arp: [0, 1, 1, 2, 2, 3, 3, 2, 2, 1, 1, 2, 2, 3, 3, 2],
    lead: [
      76, null, 79, null, 81, 79, 76, null,
      74, null, 79, null, 83, 79, 74, null,
      76, null, 74, 76, null, 72, null, null,
      77, null, 81, null, 79, 77, 76, null,
    ],
    groove: [0, 0, 12, 0, 0, 12, 0, 7],
  },
  {
    name: '노을',
    bpm: 128,
    bars: [
      { tones: [55, 59, 62], bass: 31 },
      { tones: [62, 66, 69], bass: 38 },
      { tones: [64, 67, 71], bass: 40 },
      { tones: [60, 64, 67], bass: 36 },
    ],
    arp: [2, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 1, 1, 0],
    lead: [
      79, null, 83, null, 86, 83, 79, null,
      81, null, 79, 76, null, 74, null, null,
      83, null, 81, 79, null, 76, null, null,
      76, null, 79, null, 84, 79, 76, null,
    ],
    groove: [0, 12, 0, 0, 7, 0, 12, 0],
  },
  {
    name: '소풍',
    bpm: 132,
    bars: [
      { tones: [60, 64, 67], bass: 36 },
      { tones: [53, 57, 60], bass: 29 },
      { tones: [55, 59, 62], bass: 31 },
      { tones: [57, 60, 64], bass: 33 },
    ],
    arp: [0, 1, 2, 3, 1, 2, 3, 2, 2, 1, 0, 1, 1, 0, 2, 3],
    lead: [
      72, 76, 79, null, 81, null, 79, 76,
      77, 79, 81, null, 84, null, 81, 79,
      74, null, 79, 83, null, 79, 74, null,
      76, null, 81, null, 79, 76, 74, null,
    ],
    groove: [0, 0, 12, 12, 0, 0, 7, 12],
  },
];

interface BgmPlayer {
  ctx: AudioContext;
  master: GainNode;
  noiseBuf: AudioBuffer | null;
  timer: ReturnType<typeof setInterval> | null;
  playing: boolean;
  step: number;
  nextTime: number;
  track: number;
  pending: number | null;
  tense: boolean;
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
      noiseBuf: null,
      timer: null,
      playing: false,
      step: 0,
      nextTime: 0,
      track: Math.floor(Math.random() * BGM_TRACKS.length),
      pending: null,
      tense: false,
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
  try {
    const o = p.ctx.createOscillator();
    const g = p.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== undefined) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(p.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  } catch {
    /* 오디오 미지원 환경 무시 */
  }
}

function ensureNoise(p: BgmPlayer): AudioBuffer | null {
  try {
    if (!p.noiseBuf) {
      const len = Math.max(1, Math.floor(p.ctx.sampleRate * 1));
      const buf = p.ctx.createBuffer(1, len, p.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      p.noiseBuf = buf;
    }
    return p.noiseBuf;
  } catch {
    return null;
  }
}

function noiseHit(
  p: BgmPlayer,
  t0: number,
  dur: number,
  vol: number,
  type: BiquadFilterType,
  filterFreq: number,
): void {
  const buf = ensureNoise(p);
  if (!buf) return;
  try {
    const src = p.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const f = p.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterFreq;
    const g = p.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(p.master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  } catch {
    /* 오디오 미지원 환경 무시 */
  }
}

function kickAt(p: BgmPlayer, t0: number): void {
  try {
    const o = p.ctx.createOscillator();
    const g = p.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(160, t0);
    o.frequency.exponentialRampToValueAtTime(45, t0 + 0.1);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(KICK_VOL, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
    o.connect(g);
    g.connect(p.master);
    o.start(t0);
    o.stop(t0 + 0.17);
  } catch {
    /* 오디오 미지원 환경 무시 */
  }
}

function snareAt(p: BgmPlayer, t0: number, tense: boolean): void {
  noiseHit(p, t0, 0.09, tense ? SNARE_TENSE_VOL : SNARE_VOL, 'bandpass', 1800);
  toneAt(p, 190, t0, 0.08, 0.03, 'triangle');
}

function stepDur(track: BgmTrack, tense = false): number {
  return (60 / track.bpm / 4) * (tense ? 0.8 : 1);
}

/* 16분음 그리드 한 스텝 예약. 텐션 모드에선 아르페지오가 16분음으로 촘촘해지고
   베이스 펄스+하이햇이 붙는다. 곡 교체(pending)는 마디 경계에서만 적용. */
function scheduleStep(p: BgmPlayer, step: number, t: number): void {
  if (step % STEPS_PER_BAR === 0 && p.pending !== null) {
    p.track = p.pending;
    p.pending = null;
  }
  const track = BGM_TRACKS[p.track];
  const chord = track.bars[Math.floor(step / STEPS_PER_BAR) % BAR_COUNT];
  const s16 = step % STEPS_PER_BAR;
  const sd = stepDur(track, p.tense);
  const tones = [chord.tones[0], chord.tones[1], chord.tones[2], chord.tones[0] + 12];
  // 크래시: 루프 시작, 텐션에선 매 마디
  if (step % (STEPS_PER_BAR * BAR_COUNT) === 0 || (p.tense && s16 === 0)) {
    noiseHit(p, t, 0.3, 0.06, 'highpass', 5000);
  }
  // 베이스 그루브: 8분음 파운딩 (서브가 아닌 멜로딕 음역)
  if (s16 % 2 === 0) {
    const b = chord.bass + 12 + track.groove[Math.floor(s16 / 2)];
    toneAt(p, midiFreq(b), t, sd * 1.6, BASS_VOL, 'triangle', 0.01);
  }
  // 스캥크: 오프비트 코드 (텐션에선 8분음)
  if (p.tense ? s16 % 2 === 0 : s16 % 4 === 2) {
    for (const m of chord.tones) toneAt(p, midiFreq(m + 12), t, sd * 1.2, SKANK_VOL, 'triangle');
  }
  if (p.tense || s16 % 2 === 0) {
    const m = tones[track.arp[s16]] + (p.tense ? 12 : 0);
    toneAt(p, midiFreq(m), t, sd * 1.8, p.tense ? ARP_TENSE_VOL : ARP_VOL, 'triangle');
  }
  if (s16 % 2 === 0) {
    const m = track.lead[Math.floor(step / 2) % (BAR_COUNT * 8)];
    if (m !== null) {
      toneAt(p, midiFreq(m), t, sd * 2.2, LEAD_VOL, 'triangle');
      toneAt(p, midiFreq(m), t, sd * 2.2, LEAD_SQ_VOL, 'square');
      toneAt(p, midiFreq(m + 12), t, sd * 2.2, LEAD_OCT_VOL, 'sine');
    }
  }
  if (s16 % 4 === 0) kickAt(p, t);
  if (s16 === 4 || s16 === 12) snareAt(p, t, p.tense);
  if (p.tense || s16 % 2 === 0) {
    noiseHit(p, t, 0.04, p.tense ? HAT_VOL : HAT_SOFT_VOL, 'highpass', 7000);
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
    p.nextTime += stepDur(BGM_TRACKS[p.track], p.tense);
    p.step++;
  }
}

function startScheduler(p: BgmPlayer): void {
  if (p.pending !== null) {
    p.track = p.pending;
    p.pending = null;
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

/* 스토어 변경(사운드 토글·게임오버·일시정지 등)에 BGM 재생 상태를 맞춤.
   시작·정지 시 볼륨 페이드로 부드럽게 전환. */
export function syncBgm(): void {
  const p = ensureBgm();
  if (!p) return;
  updateTension(p);
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
