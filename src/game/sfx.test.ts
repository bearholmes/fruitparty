import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameStore } from './store';
import { mergeFreq, sfx } from './sfx';

class FakeParam {
  value = 0;
  ramps: number[] = [];
  setValueAtTime(): void {}
  exponentialRampToValueAtTime(value: number): void {
    this.ramps.push(value);
  }
}

class FakeOsc {
  type = 'sine';
  frequency = new FakeParam();
  started = false;
  connect(): void {}
  start(): void {
    this.started = true;
  }
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
  gains: FakeGain[] = [];
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
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
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

function lastCtx(): FakeCtx {
  const c = FakeCtx.instances[FakeCtx.instances.length - 1];
  if (!c) throw new Error('no AudioContext created');
  return c;
}

describe('sfx', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', FakeCtx);
    useGameStore.setState({ soundOn: true, sfxVolume: 1, over: false, paused: false });
  });

  it('오디오 미지원 환경에서도 throw하지 않는다', () => {
    vi.unstubAllGlobals();
    expect(() => {
      sfx.drop();
      sfx.merge(3, 2);
      sfx.explosion();
      sfx.shake();
      sfx.gameOver();
      sfx.fanfare();
      sfx.ui();
    }).not.toThrow();
    expect(FakeCtx.instances).toHaveLength(0);
  });

  it('mergeFreq는 레벨이 높을수록 높고 콤보에 따라 올라가며 +5반음에서 멈춘다', () => {
    expect(mergeFreq(0, 0)).toBe(523.25);
    expect(mergeFreq(5, 0)).toBeGreaterThan(mergeFreq(4, 0));
    expect(mergeFreq(3, 2)).toBeGreaterThan(mergeFreq(3, 0));
    expect(mergeFreq(3, 99)).toBe(mergeFreq(3, 5));
  });

  it('drop/merge/ui는 오실레이터를 예약한다', () => {
    sfx.drop();
    expect(lastCtx().oscs).toHaveLength(1);
    sfx.merge(4, 2);
    expect(lastCtx().oscs).toHaveLength(3); // 기본음 + 배음
    sfx.ui();
    expect(lastCtx().oscs).toHaveLength(4);
  });

  it('explosion/shake는 노이즈+저음 스윕을 예약한다', () => {
    sfx.explosion();
    const c = lastCtx();
    expect(c.srcs).toHaveLength(1);
    expect(c.oscs.length).toBeGreaterThanOrEqual(1);
    sfx.shake();
    expect(c.srcs).toHaveLength(2);
  });

  it('gameOver는 4음, fanfare는 5음을 예약한다', () => {
    const c0 = lastCtx().oscs.length;
    sfx.gameOver();
    expect(lastCtx().oscs.length).toBe(c0 + 4);
    sfx.fanfare();
    expect(lastCtx().oscs.length).toBe(c0 + 9);
  });

  it('soundOn이 꺼져 있으면 컨텍스트를 만들지 않는다', () => {
    const n = FakeCtx.instances.length;
    useGameStore.getState().toggleSound();
    sfx.drop();
    sfx.merge(1, 0);
    expect(FakeCtx.instances.length).toBe(n);
  });

  it('효과음 음량을 조절하고 0이면 재생하지 않는다', () => {
    useGameStore.getState().setSfxVolume(0.5);
    sfx.drop();
    expect(lastCtx().gains.at(-1)?.gain.ramps[0]).toBeCloseTo(0.09);
    const count = lastCtx().oscs.length;
    useGameStore.getState().setSfxVolume(0);
    sfx.drop();
    expect(lastCtx().oscs).toHaveLength(count);
  });
});
