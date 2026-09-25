import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameStore } from './store';

function freshState() {
  useGameStore.setState({
    score: 0,
    best: 0,
    combo: 0,
    nextLv: 0,
    over: false,
    paused: false,
    started: true,
    danger: false,
    dangerShakeLeft: 5,
    isRecord: false,
    toast: null,
    evoUrls: [],
    soundOn: true,
    canShake: true,
  });
}

function stubLocalStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  });
  return data;
}

describe('store', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    freshState();
  });

  it('addScore는 점수를 누적하고 반올림한다', () => {
    const s = useGameStore.getState();
    s.addScore(10.6);
    s.addScore(5);
    expect(useGameStore.getState().score).toBe(16);
  });

  it('최고기록 경신 시 best를 갱신하고 localStorage에 저장한다', () => {
    const ls = stubLocalStorage();
    useGameStore.getState().addScore(100);
    expect(useGameStore.getState().best).toBe(100);
    expect(ls.get('fruitparty-best')).toBe('100');
  });

  it('localStorage가 없어도 addScore는 동작한다', () => {
    useGameStore.getState().addScore(50);
    expect(useGameStore.getState().score).toBe(50);
    expect(useGameStore.getState().best).toBe(50);
  });

  it('gameOver는 over를 세우고 기록 여부를 판정한다', () => {
    useGameStore.setState({ score: 120, best: 100 });
    useGameStore.getState().gameOver();
    const s = useGameStore.getState();
    expect(s.over).toBe(true);
    expect(s.paused).toBe(false);
    expect(s.isRecord).toBe(true);
  });

  it('0점이면 최고기록으로 인정하지 않는다', () => {
    useGameStore.setState({ score: 0, best: 0 });
    useGameStore.getState().gameOver();
    expect(useGameStore.getState().isRecord).toBe(false);
  });

  it('reset은 진행 상태를 초기화하고 다음 과일을 세팅한다', () => {
    useGameStore.setState({
      score: 99,
      over: true,
      paused: true,
      started: false,
      combo: 5,
      canShake: false,
      danger: true,
      dangerShakeLeft: 0,
    });
    useGameStore.getState().reset(3);
    const s = useGameStore.getState();
    expect(s).toMatchObject({
      score: 0,
      combo: 0,
      over: false,
      paused: false,
      isRecord: false,
      toast: null,
      nextLv: 3,
      canShake: true,
      started: true,
      danger: false,
      dangerShakeLeft: 5,
    });
  });

  it('toggleSound/setPaused/setCanShake/setCombo/토스트가 동작한다', () => {
    const s = useGameStore.getState();
    s.toggleSound();
    expect(useGameStore.getState().soundOn).toBe(false);
    s.setPaused(true);
    expect(useGameStore.getState().paused).toBe(true);
    s.setCanShake(false);
    expect(useGameStore.getState().canShake).toBe(false);
    s.setCombo(4);
    expect(useGameStore.getState().combo).toBe(4);
    s.showToast('테스트');
    expect(useGameStore.getState().toast?.msg).toBe('테스트');
    s.hideToast();
    expect(useGameStore.getState().toast).toBeNull();
  });

  it('start는 게임을 시작하고 일시정지를 푼다', () => {
    useGameStore.setState({ started: false, paused: true });
    useGameStore.getState().start();
    expect(useGameStore.getState()).toMatchObject({ started: true, paused: false });
  });

  it('위험 흔들기 횟수를 관리한다', () => {
    const s = useGameStore.getState();
    s.setDanger(true);
    s.setDangerShakeLeft(3);
    expect(useGameStore.getState()).toMatchObject({ danger: true, dangerShakeLeft: 3 });
  });
});
