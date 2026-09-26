import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SHOT_FOOTER_H,
  buildShotLines,
  composeResultShot,
  fitFontPx,
  formatShotDate,
} from './shot';

describe('shot', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('종료시간을 "연. 월. 일. 시:분" 형태로 만든다', () => {
    const ts = new Date(2026, 8, 27, 22, 5).getTime();
    expect(formatShotDate(ts)).toBe('2026. 9. 27. 22:05');
  });

  it('종료시간이 없어도 현재 시간으로 표시한다', () => {
    expect(formatShotDate(null)).toMatch(/^\d{4}\. \d{1,2}\. \d{1,2}\. \d{2}:\d{2}$/);
  });

  it('푸터에 스코어·베스트·최대콤보·피버횟수·종료시간을 담는다', () => {
    const ts = new Date(2026, 8, 27, 22, 5).getTime();
    const lines = buildShotLines({ score: 1234, best: 5678, maxCombo: 12, feverCount: 3, gameOverAt: ts });
    expect(lines).toHaveLength(3);
    expect(lines[0].text).toBe('SCORE 1234');
    expect(lines[1].text).toBe('BEST 5678 · 최대콤보 12 · 피버 3회');
    expect(lines[2].text).toBe('2026. 9. 27. 22:05');
    for (const line of lines) {
      expect(line.y + 8).toBeLessThanOrEqual(SHOT_FOOTER_H);
    }
  });

  it('텍스트가 폭에 맞으면 기본 폰트를 유지한다', () => {
    expect(fitFontPx(40, 300, () => 200)).toBe(40);
  });

  it('텍스트가 넘치면 폭에 들도록 폰트를 줄이고 최소값을 지킨다', () => {
    expect(fitFontPx(40, 300, (px) => px * 10)).toBe(30);
    expect(fitFontPx(40, 10, (px) => px * 10)).toBe(12);
  });

  it('결과 이미지는 보드 아래 푸터를 붙이고 세 줄을 중앙에 그린다', () => {
    const fillText = vi.fn();
    const ctx = {
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      fillText,
      font: '',
      fillStyle: '',
      textAlign: '',
      textBaseline: '',
    };
    const out = { width: 0, height: 0, getContext: () => ctx };
    vi.stubGlobal('document', { createElement: () => out });
    const source = { width: 420, height: 660 } as HTMLCanvasElement;

    const result = composeResultShot(source, {
      score: 1234,
      best: 5678,
      maxCombo: 12,
      feverCount: 3,
      gameOverAt: new Date(2026, 8, 27, 22, 5).getTime(),
    });

    expect(result.width).toBe(420);
    expect(result.height).toBe(660 + SHOT_FOOTER_H);
    expect(ctx.drawImage).toHaveBeenCalledWith(source, 0, 0);
    expect(fillText).toHaveBeenCalledTimes(3);
    for (const [, x, y] of fillText.mock.calls) {
      expect(x).toBe(210);
      expect(y).toBeGreaterThan(660);
      expect(y).toBeLessThan(660 + SHOT_FOOTER_H);
    }
    expect(fillText.mock.calls[0][0]).toBe('SCORE 1234');
  });

  it('긴 점수여도 푸터 폭에 맞춰 폰트를 줄여 그린다', () => {
    const fonts: string[] = [];
    const ctx = {
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      measureText: vi.fn(() => ({ width: 10000 })),
      fillText: vi.fn(),
      fillStyle: '',
      textAlign: '',
      textBaseline: '',
    };
    Object.defineProperty(ctx, 'font', {
      get(this: { _font: string }) {
        return this._font;
      },
      set(this: { _font: string }, value: string) {
        this._font = value;
        fonts.push(value);
      },
    });
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
    const source = { width: 420, height: 660 } as HTMLCanvasElement;

    composeResultShot(source, {
      score: 99999999,
      best: 99999999,
      maxCombo: 999,
      feverCount: 99,
      gameOverAt: null,
    });

    expect(ctx.fillText).toHaveBeenCalledTimes(3);
    expect(fonts[fonts.length - 1]).toContain('12px');
  });
});
