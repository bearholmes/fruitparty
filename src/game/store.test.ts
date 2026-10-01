import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameStore } from './store';
import { DANGER_SHAKE_MAX } from './constants';

function boards(name: string, score: number) {
  const entries = [{ name, score, maxCombo: null, feverCount: null }];
  return { daily: entries, weekly: entries, all: entries };
}

function freshState() {
  useGameStore.setState({
    score: 0,
    best: 0,
    combo: 0,
    maxCombo: 0,
    nextQueue: [0, 0, 0],
    over: false,
    gameOverAt: null,
    paused: false,
    started: true,
    danger: false,
    dangerShakeLeft: DANGER_SHAKE_MAX,
    isRecord: false,
    leaderboard: { daily: [], weekly: [], all: [] },
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
    simpleControls: true,
    canShake: true,
    feverActive: false,
    feverLeft: 0,
    feverCount: 0,
  });
}

describe('store', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
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

  it('게임 도중에는 개인 베스트를 갱신하지 않는다', () => {
    useGameStore.getState().addScore(100);
    expect(useGameStore.getState().best).toBe(0);
    expect(localStorage.getItem('fruitparty.personal-best')).toBeNull();
  });

  it('저장된 개인 베스트를 불러온다', () => {
    localStorage.setItem('fruitparty.personal-best', '150');
    useGameStore.getState().loadPersonalBest();
    expect(useGameStore.getState().best).toBe(150);
  });

  it('DB 순위표를 읽고 게임오버 점수의 등록 자격을 판정한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ boards: { daily: [], weekly: [], all: [{ name: '철수', score: 100, maxCombo: null, feverCount: null }] } })));
    useGameStore.setState({ over: true, score: 50 });
    await useGameStore.getState().refreshLeaderboard();
    expect(useGameStore.getState()).toMatchObject({
      leaderboard: { daily: [], weekly: [], all: [{ name: '철수', score: 100, maxCombo: null, feverCount: null }] },
      best: 0,
      pendingLeaderboard: true,
      leaderboardStatus: 'ready',
    });
  });

  it('게임오버 즉시 조회 상태가 되고 응답 후 이름 입력 자격이 유지된다', async () => {
    let resolveRequest!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { resolveRequest = resolve; })));
    useGameStore.setState({ score: 500, leaderboardStatus: 'ready' });
    useGameStore.getState().gameOver();
    expect(useGameStore.getState().leaderboardStatus).toBe('loading');
    const refresh = useGameStore.getState().refreshLeaderboard();
    expect(useGameStore.getState()).toMatchObject({ over: true, score: 500, submittedLeaderboard: false });
    resolveRequest(Response.json({ boards: boards('기존 기록', 100) }));
    await refresh;
    expect(useGameStore.getState()).toMatchObject({ over: true, score: 500, leaderboardStatus: 'ready', pendingLeaderboard: true });
  });

  it('게임오버 이전의 조회 응답이 현재 순위 확인을 끝내지 않는다', async () => {
    const responses: Array<(response: Response) => void> = [];
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { responses.push(resolve); })));
    const beforeGameOver = useGameStore.getState().refreshLeaderboard();
    useGameStore.setState({ score: 500 });
    useGameStore.getState().gameOver();
    responses[0](Response.json({ boards: boards('이전', 100) }));
    await beforeGameOver;
    expect(useGameStore.getState().leaderboardStatus).toBe('loading');
    const current = useGameStore.getState().refreshLeaderboard();
    const newer = useGameStore.getState().refreshLeaderboard();
    responses[1](Response.json({ boards: boards('오래된 결과', 100) }));
    await current;
    expect(useGameStore.getState().leaderboardStatus).toBe('loading');
    responses[2](Response.json({ boards: boards('최신 결과', 200) }));
    await newer;
    expect(useGameStore.getState()).toMatchObject({ leaderboardStatus: 'ready', pendingLeaderboard: true });
  });

  it('조회 실패 시 로딩을 해제하고 재시도할 수 있다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(Response.json({ boards: boards('기존', 100) })));
    useGameStore.setState({ score: 500 });
    useGameStore.getState().gameOver();
    await useGameStore.getState().refreshLeaderboard();
    expect(useGameStore.getState()).toMatchObject({ over: true, leaderboardStatus: 'error' });
    await useGameStore.getState().refreshLeaderboard();
    expect(useGameStore.getState()).toMatchObject({ over: true, leaderboardStatus: 'ready', pendingLeaderboard: true });
  });

  it('이름과 점수를 DB에 제출하고 중복 등록을 막는다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ boards: boards('영희', 50) }));
    vi.stubGlobal('fetch', fetchMock);
    const submissionId = '11111111-1111-4111-8111-111111111111';
    useGameStore.setState({ over: true, score: 50, maxCombo: 7, feverCount: 3, pendingLeaderboard: true, submissionId });
    expect(await useGameStore.getState().saveLeaderboardScore('영희')).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/api/leaderboard', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ name: '영희', score: 50, maxCombo: 7, feverCount: 3, submissionId });
    expect(useGameStore.getState()).toMatchObject({
      leaderboard: boards('영희', 50),
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

    resolveRequest(Response.json({ boards: boards('영희', 50) }));
    expect(await first).toBe(true);
    expect(await useGameStore.getState().saveLeaderboardScore('영희')).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('저장 실패 후 재시도에도 같은 제출 번호를 쓴다', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(Response.json({ boards: boards('영희', 50) }));
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
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ boards: boards('unknown', 50) }));
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

  it('등록을 건너뛴 이전 판의 응답이 새 판 상태를 바꾸지 않는다', async () => {
    let resolveRequest!: (response: Response) => void;
    const fetchMock = vi.fn().mockImplementation(() => new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    }));
    vi.stubGlobal('fetch', fetchMock);
    useGameStore.setState({
      over: true,
      score: 50,
      maxCombo: 4,
      pendingLeaderboard: false,
      submissionId: '55555555-5555-4555-8555-555555555555',
    });

    const saving = useGameStore.getState().saveLeaderboardScore('unknown', true);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ name: 'unknown', score: 50, maxCombo: 4 });
    useGameStore.getState().reset([1, 1, 1]);
    resolveRequest(Response.json({ boards: boards('unknown', 50) }));
    expect(await saving).toBe(true);
    expect(useGameStore.getState()).toMatchObject({
      over: false,
      pendingLeaderboard: false,
      submittedLeaderboard: false,
      submittingLeaderboard: false,
      submissionId: null,
    });
  });

  it('gameOver는 over를 세우고 기록 여부를 판정한다', () => {
    useGameStore.setState({ score: 120, best: 100 });
    useGameStore.getState().gameOver();
    const s = useGameStore.getState();
    expect(s.over).toBe(true);
    expect(s.paused).toBe(false);
    expect(s.isRecord).toBe(true);
    expect(s.best).toBe(120);
    expect(localStorage.getItem('fruitparty.personal-best')).toBe('120');
  });

  it('동점이나 낮은 점수는 개인 베스트를 덮어쓰지 않는다', () => {
    localStorage.setItem('fruitparty.personal-best', '120');
    useGameStore.getState().loadPersonalBest();
    useGameStore.setState({ score: 120 });
    useGameStore.getState().gameOver();
    expect(useGameStore.getState()).toMatchObject({ best: 120, isRecord: false });
    useGameStore.getState().reset([1, 1, 1]);
    useGameStore.setState({ score: 80 });
    useGameStore.getState().gameOver();
    expect(useGameStore.getState()).toMatchObject({ best: 120, isRecord: false });
    expect(localStorage.getItem('fruitparty.personal-best')).toBe('120');
  });

  it('gameOver는 종료시간을 기록하고 reset하면 지운다', () => {
    const before = Date.now();
    useGameStore.setState({ score: 120, best: 100 });
    useGameStore.getState().gameOver();
    const gameOverAt = useGameStore.getState().gameOverAt;
    expect(gameOverAt).not.toBeNull();
    expect(gameOverAt as number).toBeGreaterThanOrEqual(before);
    useGameStore.getState().reset([1, 1, 1]);
    expect(useGameStore.getState().gameOverAt).toBeNull();
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
    useGameStore.getState().reset([1, 2, 3]);
    const s = useGameStore.getState();
    expect(s).toMatchObject({
      score: 0,
      combo: 0,
      maxCombo: 0,
      over: false,
      paused: false,
      isRecord: false,
      toast: null,
      nextQueue: [1, 2, 3],
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
    s.setNextQueue([2, 1, 0]);
    expect(useGameStore.getState().nextQueue).toEqual([2, 1, 0]);
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

  it('조작키 UI 단순화 설정을 저장하고 다시 불러온다', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    const state = useGameStore.getState();
    expect(state.simpleControls).toBe(true);
    state.setSimpleControls(false);
    freshState();
    useGameStore.getState().loadUiSettings();
    expect(useGameStore.getState().simpleControls).toBe(false);
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

  it('피버 발동 횟수만 세고 시간 갱신은 세지 않으며 reset하면 초기화한다', () => {
    const s = useGameStore.getState();
    s.startFever(30);
    expect(useGameStore.getState()).toMatchObject({ feverActive: true, feverLeft: 30, feverCount: 1 });
    s.setFever(true, 12);
    expect(useGameStore.getState()).toMatchObject({ feverLeft: 12, feverCount: 1 });
    s.setFever(false, 0);
    s.startFever(30);
    expect(useGameStore.getState()).toMatchObject({ feverActive: true, feverLeft: 30, feverCount: 2 });
    s.reset([1, 1, 1]);
    expect(useGameStore.getState()).toMatchObject({ feverActive: false, feverLeft: 0, feverCount: 0 });
  });
});
