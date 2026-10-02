import { Pause, Play, Settings } from 'lucide-react';
import type { RefObject } from 'react';
import { NEXT_PREVIEW_COUNT } from '../game/config/ui';
import { useGameStore } from '../game/store';
import { ComboBadge } from './ComboBadge';

interface ScoreHeaderProps {
  nextCanvasRef: RefObject<HTMLCanvasElement | null>;
  onTogglePause: () => void;
  onOpenPanel: () => void;
  onOpenLeaderboard: () => void;
  mobilePanelOpen: boolean;
}

export function ScoreHeader({
  nextCanvasRef,
  onTogglePause,
  onOpenPanel,
  onOpenLeaderboard,
  mobilePanelOpen,
}: ScoreHeaderProps) {
  const score = useGameStore((s) => s.score);
  const best = useGameStore((s) => s.best);
  const combo = useGameStore((s) => s.combo);
  const over = useGameStore((s) => s.over);
  const started = useGameStore((s) => s.started);
  const paused = useGameStore((s) => s.paused);

  return (
    <div className="board-head">
      <div className="head-row">
        <div className="scores">
          <div className="score-box">
            <span>SCORE</span>
            <strong>{score}</strong>
          </div>
          <button className="score-box best best-store" onClick={onOpenLeaderboard} aria-label="베스트 스토어 순위표 열기">
            <span>BEST</span>
            <strong>{best}</strong>
          </button>
        </div>
        <div className="head-actions">
          <button
            className="btn pause-control"
            onClick={onTogglePause}
            disabled={over || !started}
            aria-label={paused ? '게임 계속하기' : '게임 일시정지'}
          >
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button
            className="btn mobile-info"
            onClick={onOpenPanel}
            aria-label="도감과 메뉴 열기"
            aria-controls="mobile-panel"
            aria-expanded={mobilePanelOpen}
          >
            <Settings size={19} />
          </button>
        </div>
      </div>
      <div className="head-row">
        <ComboBadge combo={combo} />
        <div className="next-pill">
          NEXT <canvas id="nextCanvas" ref={nextCanvasRef} width={96 * NEXT_PREVIEW_COUNT} height="96"></canvas>
        </div>
      </div>
    </div>
  );
}
