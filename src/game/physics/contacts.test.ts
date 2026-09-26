import { describe, it, expect } from 'vitest';
import { ContactTracker } from './contacts';

function body(id: number) {
  return { id };
}

describe('ContactTracker', () => {
  it('접촉 시간을 누적하고 임계값을 넘기면 합체 대상으로 올린다', () => {
    const t = new ContactTracker<{ id: number }>();
    const a = body(1);
    const b = body(2);
    t.touch(a, b, 0.1);
    expect(t.due(0.3)).toHaveLength(0);
    t.touch(a, b, 0.1);
    t.touch(a, b, 0.15);
    const due = t.due(0.3);
    expect(due).toHaveLength(1);
    expect(due[0].t).toBeCloseTo(0.35);
  });

  it('순서가 바뀌어도 같은 접촉으로 본다', () => {
    const t = new ContactTracker<{ id: number }>();
    t.touch(body(1), body(2), 0.2);
    t.touch(body(2), body(1), 0.2);
    expect(t.size).toBe(1);
    expect(t.due(0.3)).toHaveLength(1);
  });

  it('이번 프레임에 목격되지 않은 접촉은 버린다', () => {
    const t = new ContactTracker<{ id: number }>();
    t.touch(body(1), body(2), 1);
    expect(t.due(0.3)).toHaveLength(1);
    expect(t.due(0.3)).toHaveLength(0); // 두 번째 호출에선 목격 없음
    expect(t.size).toBe(0);
  });

  it('바디 삭제 시 관련된 접촉만 정리한다', () => {
    const t = new ContactTracker<{ id: number }>();
    t.touch(body(1), body(2), 1);
    t.touch(body(2), body(3), 1);
    t.touch(body(3), body(4), 1);
    t.removeBody(body(2));
    expect(t.size).toBe(1);
    t.touch(body(3), body(4), 0);
    expect(t.due(0.3)).toHaveLength(1);
  });

  it('clear하면 전부 비운다', () => {
    const t = new ContactTracker<{ id: number }>();
    t.touch(body(1), body(2), 1);
    t.clear();
    expect(t.size).toBe(0);
  });
});
