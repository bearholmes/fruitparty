import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleGameKey, type GameInputHandlers } from './input';

class FakeElement {
  constructor(private readonly editing = false) {}
  closest() { return this.editing ? this : null; }
}

function handlers(over: boolean): GameInputHandlers {
  return {
    isOver: () => over,
    setDropX: vi.fn(),
    tap: vi.fn(),
    nudge: vi.fn(),
    shake: vi.fn(),
    restart: vi.fn(),
    togglePause: vi.fn(),
    hide: vi.fn(),
  };
}

function key(code: string, target: FakeElement | null = null): KeyboardEvent {
  return { code, key: code === 'KeyR' ? 'r' : code === 'Enter' ? 'Enter' : ' ', target, preventDefault: vi.fn() } as unknown as KeyboardEvent;
}

describe('game-over keyboard input', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('게임오버 상태에서는 스페이스와 R 단축키가 게임을 진행하거나 다시 시작하지 않는다', () => {
    vi.stubGlobal('HTMLElement', FakeElement);
    const h = handlers(true);
    const space = key('Space', new FakeElement());
    handleGameKey(space, h);
    handleGameKey(key('KeyR'), h);

    expect(space.preventDefault).toHaveBeenCalledOnce();
    expect(h.tap).not.toHaveBeenCalled();
    expect(h.restart).not.toHaveBeenCalled();
  });

  it('이름 입력란에서는 스페이스의 기본 입력을 유지한다', () => {
    vi.stubGlobal('HTMLElement', FakeElement);
    const h = handlers(true);
    const space = key('Space', new FakeElement(true));
    handleGameKey(space, h);

    expect(space.preventDefault).not.toHaveBeenCalled();
    expect(h.tap).not.toHaveBeenCalled();
  });
});
