import { useState } from 'react';
import { Camera, Frown, RotateCcw, Trophy } from 'lucide-react';
import { useGameStore } from '../game/store';

interface GameOverOverlayProps {
  score: number;
  onRestart: () => void;
  onOpenLeaderboard: () => void;
  onDownloadShot: () => void;
}

export function GameOverOverlay({ score, onRestart, onOpenLeaderboard, onDownloadShot }: GameOverOverlayProps) {
  const [playerName, setPlayerName] = useState('');
  const isRecord = useGameStore((s) => s.isRecord);
  const pendingLeaderboard = useGameStore((s) => s.pendingLeaderboard);
  const submittingLeaderboard = useGameStore((s) => s.submittingLeaderboard);
  const leaderboardStatus = useGameStore((s) => s.leaderboardStatus);
  const leaderboardError = useGameStore((s) => s.leaderboardError);
  const refreshLeaderboard = useGameStore((s) => s.refreshLeaderboard);
  const saveLeaderboardScore = useGameStore((s) => s.saveLeaderboardScore);

  const submitName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!playerName.trim()) return;
    if (await saveLeaderboardScore(playerName)) {
      setPlayerName('');
      onOpenLeaderboard();
    }
  };

  return (
    <div className="overlay game-over-layer">
      <div className="card game-over-card">
        <div className="card-icon">
          <Frown size={48} />
        </div>
        <h2>게임 오버!</h2>
        <p>과일이 넘쳤어요</p>
        <div className="final">
          <span>{score}</span>점
        </div>
        {isRecord && (
          <div className="record">
            <Trophy size={18} /> 최고기록!
          </div>
        )}
        {pendingLeaderboard && (
          <form className="name-form" onSubmit={submitName}>
            <label htmlFor="player-name">베스트 20 진입! 이름을 남겨주세요</label>
            <div className="name-row">
              <input
                id="player-name"
                autoFocus
                value={playerName}
                onChange={(event) => setPlayerName(Array.from(event.target.value).slice(0, 8).join(''))}
                maxLength={8}
                placeholder="이름 (8자 이내)"
                aria-label="순위표에 표시할 이름"
              />
              <button className="btn" type="submit" disabled={!playerName.trim() || submittingLeaderboard}>
                등록
              </button>
            </div>
          </form>
        )}
        {leaderboardStatus === 'loading' && <p>순위를 확인하고 있어요…</p>}
        {leaderboardError && (
          <div className="leaderboard-error" role="alert">
            {leaderboardError}
            <button className="btn" onClick={() => void refreshLeaderboard()}>
              다시 시도
            </button>
          </div>
        )}
        <div className="game-over-actions">
          <button className="btn big" onClick={onRestart} disabled={submittingLeaderboard}>
            <RotateCcw size={20} /> 다시 하기 (R)
          </button>
          <button className="btn" onClick={onOpenLeaderboard}>
            <Trophy size={18} /> 베스트 20 보기
          </button>
          <button className="btn" onClick={onDownloadShot}>
            <Camera size={18} /> 기록 저장
          </button>
        </div>
      </div>
    </div>
  );
}
