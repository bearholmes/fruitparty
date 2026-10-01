import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGameStore } from './store';
import {
  ensureBgm,
  syncBgm,
  previewBgm,
  duckBgm,
  reshuffleBgm,
  resetTension,
  BGM_VOLUME,
  BGM_TRACKS,
  midiFreq,
  PREVIEW_MS,
  TENSION_RELEASE_SEC,
} from './bgm';

class FakeParam {
  value = 0;
  sets: number[] = [];
  ramps: number[] = [];
  setValueAtTime(value: number): void {
    this.sets.push(value);
  }
  exponentialRampToValueAtTime(value: number): void {
    this.ramps.push(value);
  }
}

class FakeOsc {
  type = 'sine';
  frequency = new FakeParam();
  connect(): void {}
  start(): void {}
  stop(): void {}
}

class FakeGain {
  gain = new FakeParam();
  connect(): void {}
}

class FakeFilter {
  type = '';
  frequency = new FakeParam();
  connect(): void {}
}

class FakeSrc {
  buffer: unknown = null;
  loop = false;
  connect(): void {}
  start(): void {}
  stop(): void {}
}

class FakeCtx {
  static instances: FakeCtx[] = [];
  currentTime = 0;
  sampleRate = 44100;
  state = 'running';
  destination = {};
  oscs: FakeOsc[] = [];
  srcs: FakeSrc[] = [];
  constructor() {
    FakeCtx.instances.push(this);
  }
  resume(): Promise<void> {
    return Promise.resolve();
  }
  createOscillator(): FakeOsc {
    const o = new FakeOsc();
    this.oscs.push(o);
    return o;
  }
  createGain(): FakeGain {
    return new FakeGain();
  }
  createBiquadFilter(): FakeFilter {
    return new FakeFilter();
  }
  createBufferSource(): FakeSrc {
    const s = new FakeSrc();
    this.srcs.push(s);
    return s;
  }
  createBuffer(): { getChannelData: () => Float32Array } {
    return { getChannelData: () => new Float32Array(8) };
  }
}

function player() {
  const p = ensureBgm();
  if (!p) throw new Error('no bgm player');
  return p;
}

function fx() {
  return player().ctx as unknown as FakeCtx;
}

function masterVol(): number {
  return (player().master.gain as unknown as FakeParam).value;
}

function oscFreqs(): number[] {
  return fx().oscs.map((o) => (o.frequency as unknown as FakeParam).sets[0]);
}

/* 가상 오디오 시계를 sec만큼 흘려보낸다 (스케줄러 tick 포함) */
function step(sec: number): void {
  const c = fx();
  c.currentTime += sec;
  vi.advanceTimersByTime(sec * 1000);
}

describe('bgm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('AudioContext', FakeCtx);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    delete (globalThis as Record<string, unknown>).__fruitparty_bgm_player;
    useGameStore.setState({
      soundOn: true,
      bgmVolume: 1,
      over: false,
      paused: false,
      started: true,
      danger: false,
      feverActive: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // 이 파일에서 오디오 컨텍스트를 처음 만드는 테스트보다 먼저 실행되어야 한다.
  it('오디오 미지원 환경에서도 throw하지 않고 null을 반환한다', () => {
    vi.unstubAllGlobals();
    expect(ensureBgm()).toBeNull();
    expect(() => {
      syncBgm();
      previewBgm();
      duckBgm();
      reshuffleBgm();
    }).not.toThrow();
    expect(FakeCtx.instances).toHaveLength(0);
  });

  it('싱글턴 플레이어를 만들고 컨텍스트는 하나만 쓴다', () => {
    expect(ensureBgm()).toBe(ensureBgm());
    expect(FakeCtx.instances.length).toBeLessThanOrEqual(1);
  });

  it('곡은 3개이며 템포·화음이 다르고 아르페지오·리드 구성이 맞다', () => {
    expect(BGM_TRACKS).toHaveLength(3);
    expect(new Set(BGM_TRACKS.map((t) => t.bpm)).size).toBe(3);
    expect(new Set(BGM_TRACKS.map((t) => t.name)).size).toBe(3);
    for (const t of BGM_TRACKS) {
      expect(t.bars).toHaveLength(4);
      expect(t.arp).toHaveLength(16);
      expect(t.lead).toHaveLength(32);
      expect(t.lead.some((m) => m !== null)).toBe(true);
      for (const bar of t.bars) {
        expect(bar.tones).toHaveLength(3);
        for (const m of [...bar.tones, bar.bass]) {
          expect(m).toBeGreaterThanOrEqual(21);
          expect(m).toBeLessThanOrEqual(108);
        }
      }
      for (const idx of t.arp) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(3);
      }
      for (const m of t.lead) {
        if (m === null) continue;
        expect(m).toBeGreaterThanOrEqual(21);
        expect(m).toBeLessThanOrEqual(108);
      }
      expect(t.groove).toHaveLength(8);
      for (const off of t.groove) {
        expect(off).toBeGreaterThanOrEqual(0);
        expect(off).toBeLessThanOrEqual(12);
      }
    }
    expect(midiFreq(69)).toBe(440);
  });

  it('재생 조건이면 스케줄러가 그루브 편곡을 예약한다', () => {
    syncBgm();
    const c = fx();
    expect(player().playing).toBe(true);
    // 0번 곡: 0스텝(베이스+아르페지오+리드3음+킥)과 2스텝(베이스+스캥크3음+아르페지오)
    expect(c.oscs).toHaveLength(11);
    expect(oscFreqs()).toEqual(
      [...[48, 60, 76, 76, 88].map((m) => midiFreq(m)), 160, ...[48, 72, 76, 79, 64].map((m) => midiFreq(m))],
    );
    expect(new Set(c.oscs.map((o) => o.type))).toEqual(new Set(['sine', 'triangle', 'square']));
  });

  it('한 바퀴 돌면 리드 멜로디 전음과 킥·스네어가 예약된다', () => {
    syncBgm();
    for (let i = 0; i < 96; i++) step(0.1);
    const freqs = oscFreqs();
    for (const m of BGM_TRACKS[0].lead) {
      if (m !== null) expect(freqs).toContain(midiFreq(m));
    }
    expect(freqs).toContain(160); // 킥
    expect(freqs).toContain(190); // 스네어 바디
    expect(fx().srcs.length).toBeGreaterThan(0); // 스네어·햇 노이즈
  });

  it('시간이 흐르면 다음 스텝을 계속 예약한다', () => {
    syncBgm();
    const n = fx().oscs.length;
    step(0.5);
    expect(fx().oscs.length).toBeGreaterThan(n);
  });

  it('reshuffleBgm은 다른 곡을 고르고 마디 경계에서 전환한다', () => {
    syncBgm();
    expect(reshuffleBgm()).toBe(1); // random=0이면 충돌 회피로 다음 곡
    expect(player().track).toBe(0);
    expect(player().pending).toBe(1);
    for (let i = 0; i < 40; i++) step(0.1);
    expect(player().track).toBe(1);
    expect(player().pending).toBeNull();
  });

  it('정지 상태의 reshuffleBgm은 즉시 곡을 바꾼다', () => {
    expect(player().track).toBe(0);
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(reshuffleBgm()).toBe(2);
    expect(player().track).toBe(2);
    expect(player().pending).toBeNull();
  });

  it('danger면 텐션 편곡으로 바뀌고 해제 4초 뒤 복귀한다', () => {
    syncBgm();
    step(0.3);
    const hats = fx().srcs.length;
    useGameStore.setState({ danger: true });
    const before = fx().oscs.length;
    syncBgm();
    expect(player().tense).toBe(true);
    // 위험 진입 경보음: 상승 블립 2회
    const stinger = fx().oscs.slice(before);
    expect(stinger).toHaveLength(2);
    for (const o of stinger) {
      expect(o.type).toBe('square');
      expect(o.frequency.sets[0]).toBe(660);
      expect(o.frequency.ramps).toContain(990);
    }
    step(0.3);
    expect(fx().srcs.length).toBeGreaterThan(hats); // 하이햇 추가
    // 텐션 아르페지오는 한 옥타브 위 (0번 곡 첫 마디에선 84가 그 증거)
    for (let i = 0; i < 24; i++) step(0.1);
    expect(oscFreqs()).toContain(midiFreq(84));
    useGameStore.setState({ danger: false });
    syncBgm();
    expect(player().tense).toBe(true); // 아직 유지
    vi.advanceTimersByTime(TENSION_RELEASE_SEC * 1000 - 1);
    expect(player().tense).toBe(true);
    vi.advanceTimersByTime(1);
    expect(player().tense).toBe(false);
  });

  it('피버면 같은 시간에 더 많은 스텝을 예약한다 (템포 상승)', () => {
    syncBgm();
    for (let i = 0; i < 20; i++) step(0.1);
    const normalSteps = player().step;
    useGameStore.setState({ feverActive: true });
    syncBgm();
    expect(player().fever).toBe(true);
    const base = player().step;
    for (let i = 0; i < 20; i++) step(0.1);
    expect(player().step - base).toBeGreaterThan(normalSteps);
  });

  it('피버면 리드가 한 옥타브 올라가고 끝나면 편곡이 복귀한다', () => {
    syncBgm();
    useGameStore.setState({ feverActive: true });
    syncBgm();
    expect(player().fever).toBe(true);
    for (let i = 0; i < 96; i++) step(0.1);
    // 0번 곡 리드 최고음 83 → 피버 옥타브업 + 고음 하모닉 = 107
    expect(oscFreqs()).toContain(midiFreq(107));
    useGameStore.setState({ feverActive: false });
    syncBgm();
    expect(player().fever).toBe(false);
  });

  it('resetTension은 텐션과 해제 타이머를 초기화한다', () => {
    syncBgm();
    useGameStore.setState({ danger: true });
    syncBgm();
    expect(player().tense).toBe(true);
    useGameStore.setState({ danger: false });
    syncBgm(); // 해제 타이머 시작
    resetTension();
    expect(player().tense).toBe(false);
    vi.advanceTimersByTime(TENSION_RELEASE_SEC * 1000 + 500);
    expect(player().tense).toBe(false);
    // 이후 위험이 다시 오면 정상 동작
    useGameStore.setState({ danger: true });
    syncBgm();
    expect(player().tense).toBe(true);
  });

  it('재생 조건이면 페이드인한다', () => {
    syncBgm();
    expect(masterVol()).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(masterVol()).toBe(BGM_VOLUME);
  });

  it('음소거 시 페이드아웃 후 정지한다', () => {
    syncBgm();
    vi.advanceTimersByTime(1000);
    useGameStore.getState().toggleSound(); // soundOn=false
    syncBgm();
    vi.advanceTimersByTime(300);
    expect(masterVol()).toBe(0);
    expect(player().playing).toBe(false);
  });

  it('게임오버·일시정지·시작 전에는 스케줄러를 돌리지 않는다', () => {
    const n = fx().oscs.length;
    useGameStore.setState({ over: true });
    syncBgm();
    expect(player().playing).toBe(false);
    expect(fx().oscs.length).toBe(n);
    useGameStore.setState({ over: false, paused: true });
    syncBgm();
    expect(player().playing).toBe(false);
    expect(fx().oscs.length).toBe(n);
    useGameStore.setState({ paused: false, started: false });
    syncBgm();
    expect(player().playing).toBe(false);
    expect(fx().oscs.length).toBe(n);
  });

  it('페이드아웃 중 다시 켜지면 멈추지 않고 복귀한다', () => {
    syncBgm();
    vi.advanceTimersByTime(1000); // 재생 중
    useGameStore.setState({ soundOn: false });
    syncBgm();
    vi.advanceTimersByTime(100); // 페이드아웃 진행 중
    useGameStore.setState({ soundOn: true });
    syncBgm();
    vi.advanceTimersByTime(1000);
    expect(player().playing).toBe(true);
    expect(masterVol()).toBe(BGM_VOLUME);
  });

  it('duckBgm은 잠깐 낮췄다가 복구한다', () => {
    syncBgm();
    vi.advanceTimersByTime(1000);
    expect(masterVol()).toBe(BGM_VOLUME);
    duckBgm();
    expect(masterVol()).toBeLessThan(BGM_VOLUME);
    vi.advanceTimersByTime(600);
    expect(masterVol()).toBe(BGM_VOLUME);
  });

  it('정지 상태에서는 duck하지 않는다', () => {
    const vol = masterVol();
    duckBgm();
    vi.advanceTimersByTime(1000);
    expect(masterVol()).toBe(vol);
  });

  it('재생 중 음량 변경에 마스터 게인이 따라간다', () => {
    syncBgm();
    vi.advanceTimersByTime(1000);
    useGameStore.getState().setBgmVolume(0.5);
    syncBgm();
    expect(masterVol()).toBeCloseTo(BGM_VOLUME * 0.5);
    duckBgm();
    expect(masterVol()).toBeCloseTo(0.12 * 0.5);
    vi.advanceTimersByTime(600);
    expect(masterVol()).toBeCloseTo(BGM_VOLUME * 0.5);
  });

  it('배경음악 음량 0에서는 멈추고 다시 올리면 재생한다', () => {
    syncBgm();
    vi.advanceTimersByTime(1000);
    useGameStore.getState().setBgmVolume(0);
    syncBgm();
    vi.advanceTimersByTime(300);
    expect(player().playing).toBe(false);
    useGameStore.getState().setBgmVolume(0.5);
    syncBgm();
    vi.advanceTimersByTime(1000);
    expect(player().playing).toBe(true);
    expect(masterVol()).toBeCloseTo(BGM_VOLUME * 0.5);
  });

  it('일시정지 메뉴에서 음량을 잠시 들려주고 다시 멈춘다', () => {
    useGameStore.setState({ paused: true, bgmVolume: 0.25 });
    previewBgm();
    expect(player().playing).toBe(true);
    expect(masterVol()).toBeCloseTo(BGM_VOLUME * 0.25);
    vi.advanceTimersByTime(PREVIEW_MS + 300);
    expect(player().playing).toBe(false);
    expect(masterVol()).toBe(0);
  });

  it('반복 호출해도 플레이어·컨텍스트가 늘지 않는다', () => {
    syncBgm();
    const p = player();
    const n = FakeCtx.instances.length;
    vi.advanceTimersByTime(1000);
    duckBgm();
    vi.advanceTimersByTime(1000);
    syncBgm();
    reshuffleBgm();
    expect(ensureBgm()).toBe(p);
    expect(FakeCtx.instances.length).toBe(n);
  });

  it('게임오버 후 다시 시작하면 BGM이 재개된다', () => {
    syncBgm();
    vi.advanceTimersByTime(1000);
    expect(player().playing).toBe(true);
    useGameStore.getState().gameOver();
    syncBgm(); // 구독이 호출
    vi.advanceTimersByTime(500);
    expect(player().playing).toBe(false);
    useGameStore.getState().reset([1, 1, 1]);
    syncBgm(); // 구독이 호출
    expect(player().playing).toBe(true);
    const n = fx().oscs.length;
    for (let i = 0; i < 5; i++) step(0.2); // 오디오 시계도 함께 흘려보냄
    expect(masterVol()).toBe(BGM_VOLUME);
    expect(fx().oscs.length).toBeGreaterThan(n);
  });

  it('페이드아웃 중 다시 시작해도 BGM이 끊기지 않는다', () => {
    syncBgm();
    vi.advanceTimersByTime(1000);
    useGameStore.getState().gameOver();
    syncBgm();
    vi.advanceTimersByTime(100); // 페이드아웃 진행 중
    expect(player().playing).toBe(true);
    useGameStore.getState().reset([1, 1, 1]);
    syncBgm();
    vi.advanceTimersByTime(1000);
    expect(player().playing).toBe(true);
    expect(masterVol()).toBe(BGM_VOLUME);
  });

  it('플레이 중 다시 시작하면 BGM이 계속 재생된다', () => {
    syncBgm();
    vi.advanceTimersByTime(1000);
    useGameStore.getState().reset([1, 1, 1]);
    syncBgm();
    expect(player().playing).toBe(true);
    const n = fx().oscs.length;
    step(0.5);
    expect(fx().oscs.length).toBeGreaterThan(n);
  });

  it('일시정지 후 다시 시작하면 BGM이 재개된다', () => {
    syncBgm();
    vi.advanceTimersByTime(1000);
    useGameStore.getState().setPaused(true);
    syncBgm();
    vi.advanceTimersByTime(500);
    expect(player().playing).toBe(false);
    useGameStore.getState().reset([1, 1, 1]);
    syncBgm();
    vi.advanceTimersByTime(1000);
    expect(player().playing).toBe(true);
    expect(masterVol()).toBe(BGM_VOLUME);
  });
});
