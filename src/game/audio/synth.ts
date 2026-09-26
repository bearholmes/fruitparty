/* BGM·효과음 공용 신스 — 오실레이터 톤과 필터드 노이즈.
   호출 순서·엔벨로프는 기존 bgm/sfx와 동일하게 유지 (테스트가 노드 수·주파수를 검증). */

export interface ToneOptions {
  freq: number;
  freqEnd?: number;
  type?: OscillatorType;
  dur?: number;
  /** 최종 볼륨 (스토어 음량 스케일은 호출자가 적용) */
  vol: number;
  attack?: number;
  /** 절대 예약 시각. 없으면 currentTime + delay */
  at?: number;
  delay?: number;
}

export function playTone(ctx: AudioContext, dest: AudioNode, opts: ToneOptions): void {
  try {
    const dur = opts.dur ?? 0.15;
    const attack = opts.attack ?? 0.02;
    const t0 = opts.at ?? ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    /* 오디오 미지원 환경 무시 */
  }
}

export interface NoiseOptions {
  dur?: number;
  /** 최종 볼륨 (스토어 음량 스케일은 호출자가 적용) */
  vol: number;
  filterFreq?: number;
  filterType?: BiquadFilterType;
  attack?: number;
  at?: number;
  delay?: number;
}

const noiseBufs = new WeakMap<AudioContext, AudioBuffer>();

export function getNoiseBuffer(ctx: AudioContext): AudioBuffer | null {
  try {
    const cached = noiseBufs.get(ctx);
    if (cached) return cached;
    const len = Math.max(1, Math.floor(ctx.sampleRate * 1));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noiseBufs.set(ctx, buf);
    return buf;
  } catch {
    return null;
  }
}

export function playNoise(ctx: AudioContext, dest: AudioNode, opts: NoiseOptions): void {
  const buf = getNoiseBuffer(ctx);
  if (!buf) return;
  try {
    const dur = opts.dur ?? 0.3;
    const attack = opts.attack ?? 0.02;
    const t0 = opts.at ?? ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = opts.filterType ?? 'lowpass';
    f.frequency.value = opts.filterFreq ?? 800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  } catch {
    /* 오디오 미지원 환경 무시 */
  }
}
