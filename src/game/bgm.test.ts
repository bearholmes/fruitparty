import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGameStore } from './store';
import { ensureBgm, syncBgm, previewBgm, duckBgm, BGM_VOLUME } from './bgm';

class FakeAudio {
  static instances: FakeAudio[] = [];
  src: string;
  loop = false;
  volume = 1;
  paused = true;
  playCalls = 0;
  pauseCalls = 0;
  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }
  play(): Promise<void> {
    this.playCalls++;
    this.paused = false;
    return Promise.resolve();
  }
  pause(): void {
    this.pauseCalls++;
    this.paused = true;
  }
}

function bgm(): FakeAudio {
  return ensureBgm() as unknown as FakeAudio;
}

function currentVolume(a: { volume: number }): number {
  const graph = (globalThis as unknown as { __fruitparty_bgm_graph?: { gain: { gain: { value: number } } } }).__fruitparty_bgm_graph;
  return graph?.gain.gain.value ?? a.volume;
}

describe('bgm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('Audio', FakeAudio);
    delete (globalThis as Record<string, unknown>).__fruitparty_bgm;
    delete (globalThis as Record<string, unknown>).__fruitparty_bgm_graph;
    useGameStore.setState({ soundOn: true, bgmVolume: 1, over: false, paused: false, started: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('ensureBgm은 loop·volume이 설정된 싱글턴을 만든다', () => {
    const a = bgm();
    expect(a.src).toMatch(/bgm\.wav$/);
    expect(a.loop).toBe(true);
    expect(currentVolume(a)).toBe(BGM_VOLUME);
    expect(ensureBgm()).toBe(ensureBgm());
  });

  it('재생 조건이면 play 후 페이드인한다', () => {
    const a = bgm();
    syncBgm();
    expect(a.paused).toBe(false);
    expect(currentVolume(a)).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(currentVolume(a)).toBe(BGM_VOLUME);
  });

  it('음소거 시 페이드아웃 후 pause한다', () => {
    const a = bgm();
    syncBgm();
    vi.advanceTimersByTime(1000);
    useGameStore.getState().toggleSound(); // soundOn=false
    syncBgm();
    vi.advanceTimersByTime(300);
    expect(currentVolume(a)).toBe(0);
    expect(a.paused).toBe(true);
  });

  it('게임오버·일시정지 상태에서는 재생하지 않는다', () => {
    const a = bgm();
    const calls = a.playCalls;
    useGameStore.setState({ over: true });
    syncBgm();
    expect(a.playCalls).toBe(calls);
    useGameStore.setState({ over: false, paused: true });
    syncBgm();
    expect(a.playCalls).toBe(calls);
  });

  it('페이드아웃 중 다시 켜지면 멈추지 않고 복귀한다', () => {
    const a = bgm();
    syncBgm();
    vi.advanceTimersByTime(1000); // 재생 중
    useGameStore.setState({ soundOn: false });
    syncBgm();
    vi.advanceTimersByTime(100); // 페이드아웃 진행 중
    useGameStore.setState({ soundOn: true });
    syncBgm();
    vi.advanceTimersByTime(1000);
    expect(a.paused).toBe(false);
    expect(currentVolume(a)).toBe(BGM_VOLUME);
  });

  it('duckBgm은 잠깐 낮췄다가 복구한다', () => {
    const a = bgm();
    syncBgm();
    vi.advanceTimersByTime(1000);
    expect(currentVolume(a)).toBe(BGM_VOLUME);
    duckBgm();
    expect(currentVolume(a)).toBeLessThan(BGM_VOLUME);
    vi.advanceTimersByTime(600);
    expect(currentVolume(a)).toBe(BGM_VOLUME);
  });

  it('재생 중 음량 변경과 duck 복구에 선택한 음량을 쓴다', () => {
    const a = bgm();
    syncBgm();
    vi.advanceTimersByTime(1000);
    useGameStore.getState().setBgmVolume(0.5);
    syncBgm();
    expect(currentVolume(a)).toBeCloseTo(BGM_VOLUME * 0.5);
    duckBgm();
    expect(currentVolume(a)).toBeCloseTo(0.12 * 0.5);
    vi.advanceTimersByTime(600);
    expect(currentVolume(a)).toBeCloseTo(BGM_VOLUME * 0.5);
  });

  it('오디오 요소의 volume이 고정된 기기에서도 Web Audio 게인으로 음량을 바꾼다', () => {
    class FixedVolumeAudio {
      paused = true;
      loop = false;
      constructor(public src: string) {}
      get volume(): number { return 1; }
      set volume(_value: number) {}
      play(): Promise<void> { this.paused = false; return Promise.resolve(); }
      pause(): void { this.paused = true; }
    }
    class FakeGain {
      gain = { value: 1 };
      connect(): void {}
    }
    class FakeContext {
      static gain: FakeGain;
      state = 'running';
      destination = {};
      createGain(): FakeGain { return (FakeContext.gain = new FakeGain()); }
      createMediaElementSource(): { connect: () => void } { return { connect() {} }; }
      resume(): Promise<void> { return Promise.resolve(); }
    }
    vi.stubGlobal('Audio', FixedVolumeAudio);
    vi.stubGlobal('AudioContext', FakeContext);
    const a = ensureBgm() as FixedVolumeAudio;
    syncBgm();
    vi.advanceTimersByTime(1000);
    expect(a.volume).toBe(1);
    expect(FakeContext.gain.gain.value).toBeCloseTo(BGM_VOLUME);
    useGameStore.getState().setBgmVolume(0.25);
    syncBgm();
    expect(FakeContext.gain.gain.value).toBeCloseTo(BGM_VOLUME * 0.25);
    useGameStore.getState().setBgmVolume(0);
    syncBgm();
    vi.advanceTimersByTime(300);
    expect(FakeContext.gain.gain.value).toBe(0);
    expect(a.paused).toBe(true);
  });

  it('배경음악 음량 0에서는 멈추고 다시 올리면 재생한다', () => {
    const a = bgm();
    syncBgm();
    vi.advanceTimersByTime(1000);
    useGameStore.getState().setBgmVolume(0);
    syncBgm();
    vi.advanceTimersByTime(300);
    expect(a.paused).toBe(true);
    useGameStore.getState().setBgmVolume(0.5);
    syncBgm();
    vi.advanceTimersByTime(1000);
    expect(a.paused).toBe(false);
    expect(currentVolume(a)).toBeCloseTo(BGM_VOLUME * 0.5);
  });

  it('일시정지 메뉴에서 음량을 잠시 들려주고 다시 멈춘다', () => {
    const a = bgm();
    useGameStore.setState({ paused: true, bgmVolume: 0.25 });
    previewBgm();
    expect(a.paused).toBe(false);
    expect(currentVolume(a)).toBeCloseTo(BGM_VOLUME * 0.25);
    vi.advanceTimersByTime(1200);
    expect(a.paused).toBe(true);
  });

  it('정지 상태에서는 duck하지 않는다', () => {
    const a = bgm();
    a.pause();
    const vol = currentVolume(a);
    duckBgm();
    vi.advanceTimersByTime(1000);
    expect(currentVolume(a)).toBe(vol);
  });

  it('시작 전에는 재생하지 않는다', () => {
    const a = bgm();
    const calls = a.playCalls;
    useGameStore.setState({ started: false });
    syncBgm();
    expect(a.playCalls).toBe(calls);
  });

  it('반복 호출해도 오디오 인스턴스가 늘지 않는다', () => {
    bgm();
    const n = FakeAudio.instances.length;
    syncBgm();
    vi.advanceTimersByTime(1000);
    duckBgm();
    vi.advanceTimersByTime(1000);
    syncBgm();
    expect(ensureBgm()).toBe(bgm());
    expect(FakeAudio.instances.length).toBe(n);
  });
});
