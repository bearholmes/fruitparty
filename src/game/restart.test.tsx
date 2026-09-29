import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { useGameStore } from './store';
import { useGameEngine } from './useGameEngine';

const initial = useGameStore.getState();
afterEach(() => useGameStore.setState(initial, true));

it('순위 확인 중 재시작 콜백이 호출돼도 unknown을 제출하거나 게임오버를 해제하지 않는다', () => {
  let restart!: () => void;
  function Harness() {
    restart = useGameEngine().restart;
    return null;
  }
  renderToString(React.createElement(Harness));
  const save = vi.fn().mockResolvedValue(true);
  useGameStore.setState({
    over: true, score: 9999, leaderboardStatus: 'loading',
    submittedLeaderboard: false, submittingLeaderboard: false,
    saveLeaderboardScore: save,
  });
  restart();
  restart();
  expect(save).not.toHaveBeenCalled();
  expect(useGameStore.getState()).toMatchObject({ over: true, score: 9999, leaderboardStatus: 'loading' });

  // 같은 콜백도 조회 완료 뒤에는 최신 상태를 읽고 정상 재시작 경로로 들어간다.
  useGameStore.setState({ leaderboardStatus: 'ready' });
  restart();
  expect(save).toHaveBeenCalledExactlyOnceWith('unknown', true);
});
