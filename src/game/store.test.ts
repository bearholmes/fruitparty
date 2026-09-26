import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameStore } from './store';
import { DANGER_SHAKE_MAX } from './constants';

function freshState() {
  useGameStore.setState({
    score: 0,
    best: 0,
    combo: 0,
    maxCombo: 0,
    nextLv: 0,
    over: false,
    paused: false,
    started: true,
    danger: false,
    dangerShakeLeft: DANGER_SHAKE_MAX,
    isRecord: false,
    leaderboard: [],
    pendingLeaderboard: false,
    submittedLeaderboard: false,
    submittingLeaderboard: false,
    submissionId: null,
    leaderboardStatus: 'idle',
    leaderboardError: null,
    toast: null,
    evoUrls: [],
    soundOn: true,
    bgmVolume: 0.5,
    sfxVolume: 1,
    canShake: true,
  });
}

describe('store', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    freshState();
  });

  it('배경음악 기본 음량은 50%다', () => {
    expect(useGameStore.getInitialState().bgmVolume).toBe(0.5);
  });

  it('addScore는 점수를 누적하고 반올림한다', () => {
    const s = useGameStore.getState();
    s.addScore(10.6);
    s.addScore(5);
    expect(useGameStore.getState().score).toBe(16);
  });

  it('최고기록 경신 시 best를 갱신한다', () => {
    useGameStore.getState().addScore(100);
    expect(useGameStore.getState().best).toBe(100);
  });

  it('DB 순위표를 읽고 게임오버 점수의 등록 자격을 판정한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ entries: [{ name: '철수', score: 100 }] })));
    useGameStore.setState({ over: true, score: 50 });
    await useGameStore.getState().refreshLeaderboard();
    expect(useGameStore.getState()).toMatchObject({
      leaderboard: [{ name: '철수', score: 100 }],
      best: 100,
      pendingLeaderboard: true,
      leaderboardStatus: 'ready',
    });
  });

  it('이름과 점수를 DB에 제출하고 중복 등록을 막는다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ entries: [{ name: '영희', score: 50 }] }));
    vi.stubGlobal('fetch', fetchMock);
    const submissionId = '11111111-1111-4111-8111-111111111111';
    useGameStore.setState({ over: true, score: 50, maxCombo: 7, pendingLeaderboard: true, submissionId });
    expect(await useGameStore.getState().saveLeaderboardScore('영희')).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/api/leaderboard', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ name: '영희', score: 50, maxCombo: 7, submissionId });
    expect(useGameStore.getState()).toMatchObject({
      leaderboard: [{ name: '영희', score: 50 }],
      pendingLeaderboard: false,
      submittedLeaderboard: true,
      submittingLeaderboard: false,
    });
  });

  it('등록 버튼을 연타해도 요청을 한 번만 보낸다', async () => {
    let resolveRequest!: (response: Response) => void;
    const fetchMock = vi.fn().mockImplementation(() => new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    }));
    vi.stubGlobal('fetch', fetchMock);
    useGameStore.setState({
      over: true,
      score: 50,
      pendingLeaderboard: true,
      submissionId: '22222222-2222-4222-8222-222222222222',
    });

    const first = useGameStore.getState().saveLeaderboardScore('영희');
    const second = useGameStore.getState().saveLeaderboardScore('영희');
    expect(useGameStore.getState().submittingLeaderboard).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await second).toBe(false);

    resolveRequest(Response.json({ entries: [{ name: '영희', score: 50 }] }));
    expect(await first).toBe(true);
    expect(await useGameStore.getState().saveLeaderboardScore('영희')).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('저장 실패 후 재시도에도 같은 제출 번호를 쓴다', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(Response.json({ entries: [{ name: '영희', score: 50 }] }));
    vi.stubGlobal('fetch', fetchMock);
    const submissionId = '33333333-3333-4333-8333-333333333333';
    useGameStore.setState({ over: true, score: 50, pendingLeaderboard: true, submissionId });

    expect(await useGameStore.getState().saveLeaderboardScore('영희')).toBe(false);
    expect(useGameStore.getState().submittingLeaderboard).toBe(false);
    expect(await useGameStore.getState().saveLeaderboardScore('영희')).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, options] of fetchMock.mock.calls) {
      expect(JSON.parse(options.body).submissionId).toBe(submissionId);
    }
  });

  it('등록을 건너뛰면 unknown으로 저장하고 pending을 해제한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ entries: [{ name: 'unknown', score: 50 }] }));
    vi.stubGlobal('fetch', fetchMock);
    useGameStore.setState({
      over: true,
      score: 50,
      maxCombo: 4,
      pendingLeaderboard: true,
      submissionId: '44444444-4444-4444-8444-444444444444',
    });
    expect(await useGameStore.getState().saveLeaderboardScore('unknown')).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ name: 'unknown', score: 50, maxCombo: 4 });
    expect(useGameStore.getState()).toMatchObject({
      pendingLeaderboard: false,
      submittedLeaderboard: true,
    });
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
      maxCombo: 5,
      canShake: false,
      danger: true,
      dangerShakeLeft: 0,
    });
    useGameStore.getState().reset(3);
    const s = useGameStore.getState();
    expect(s).toMatchObject({
      score: 0,
      combo: 0,
      maxCombo: 0,
      over: false,
      paused: false,
      isRecord: false,
      toast: null,
      nextLv: 3,
      canShake: true,
      started: true,
      danger: false,
      dangerShakeLeft: DANGER_SHAKE_MAX,
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
    s.setCombo(0);
    expect(useGameStore.getState().maxCombo).toBe(4);
    s.showToast('테스트');
    expect(useGameStore.getState().toast?.msg).toBe('테스트');
    s.hideToast();
    expect(useGameStore.getState().toast).toBeNull();
  });

  it('배경음악과 효과음 음량을 따로 저장하고 다시 불러온다', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    const state = useGameStore.getState();
    state.setBgmVolume(0.4);
    state.setSfxVolume(0.7);
    state.toggleSound();
    freshState();
    useGameStore.getState().loadAudioSettings();
    expect(useGameStore.getState()).toMatchObject({ soundOn: false, bgmVolume: 0.4, sfxVolume: 0.7 });
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
