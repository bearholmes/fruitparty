import { memo } from 'react';
import { Trophy, X } from 'lucide-react';
import {
  formatLeaderboardDate,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from '../game/leaderboard';
import { useGameStore } from '../game/store';

const TABS = [
  ['daily', '일간 베스트'],
  ['weekly', '주간 베스트'],
  ['all', '전체 베스트'],
] as const;

const LeaderboardRow = memo(function LeaderboardRow({
  index,
  entry,
}: {
  index: number;
  entry: LeaderboardEntry | undefined;
}) {
  return (
    <div className="leaderboard-row">
      <span className="leaderboard-rank">{index + 1}</span>
      <div className="leaderboard-player">
        <span className="leaderboard-name">
          <strong>{entry?.name ?? '—'}</strong>
        </span>
        <span className="leaderboard-combo">
          Max Combo {entry?.maxCombo == null ? '—' : `x${entry.maxCombo}`} | FT{' '}
          {entry?.feverCount == null ? '—' : `x${entry.feverCount}`}
        </span>
      </div>
      <div className="leaderboard-score">
        <strong>{entry?.score.toLocaleString() ?? '—'}</strong>
        {entry && (
          <time className="leaderboard-date" dateTime={entry.createdAt ?? undefined}>
            {formatLeaderboardDate(entry.createdAt)}
          </time>
        )}
      </div>
    </div>
  );
});

interface LeaderboardDialogProps {
  active: LeaderboardPeriod;
  onTabChange: (period: LeaderboardPeriod) => void;
  onClose: () => void;
}

export function LeaderboardDialog({ active, onTabChange, onClose }: LeaderboardDialogProps) {
  const leaderboard = useGameStore((s) => s.leaderboard);
  const leaderboardStatus = useGameStore((s) => s.leaderboardStatus);
  const leaderboardError = useGameStore((s) => s.leaderboardError);
  const refreshLeaderboard = useGameStore((s) => s.refreshLeaderboard);
  const visibleLeaderboard = leaderboard[active];

  return (
    <div className="leaderboard-layer" onClick={onClose}>
      <section
        className="leaderboard-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leaderboard-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="leaderboard-head">
          <h2 id="leaderboard-title"><Trophy size={24} /> 베스트 스토어 TOP 20</h2>
          <button className="btn" onClick={onClose} aria-label="순위표 닫기"><X size={20} /></button>
        </div>
        <div className="leaderboard-tabs" role="tablist" aria-label="순위 집계 기간">
          {TABS.map(([period, label]) => (
            <button
              key={period}
              id={`leaderboard-tab-${period}`}
              className="leaderboard-tab"
              type="button"
              role="tab"
              aria-selected={active === period}
              aria-controls="leaderboard-panel"
              onClick={() => onTabChange(period)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="leaderboard-list" id="leaderboard-panel" role="tabpanel" aria-labelledby={`leaderboard-tab-${active}`}>
          {leaderboardStatus === 'loading' && <p>순위표를 불러오는 중…</p>}
          {leaderboardStatus === 'error' && (
            <div className="leaderboard-error" role="alert">
              {leaderboardError}
              <button className="btn" onClick={() => void refreshLeaderboard()}>다시 시도</button>
            </div>
          )}
          {leaderboardStatus === 'ready' && Array.from({ length: 20 }, (_, index) => (
            <LeaderboardRow key={index} index={index} entry={visibleLeaderboard[index]} />
          ))}
        </div>
      </section>
    </div>
  );
}
