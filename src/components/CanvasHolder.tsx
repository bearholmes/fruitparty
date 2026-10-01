import type { RefObject } from 'react';
import { BOARD_W, BOARD_H } from '../game/config/board';
import { FEVER_DURATION_SEC, FEVER_SCORE_MULT } from '../game/config/fever';
import { useGameStore } from '../game/store';
import { GameOverOverlay } from './GameOverOverlay';
import { PauseOverlay } from './PauseOverlay';
import { StartOverlay } from './StartOverlay';
import { Toast } from './Toast';

interface CanvasHolderProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onStart: () => void;
  onRestart: () => void;
  onTogglePause: () => void;
  onOpenLeaderboard: () => void;
  onDownloadShot: () => void;
}

export function CanvasHolder({
  canvasRef,
  onStart,
  onRestart,
  onTogglePause,
  onOpenLeaderboard,
  onDownloadShot,
}: CanvasHolderProps) {
  const score = useGameStore((s) => s.score);
  const over = useGameStore((s) => s.over);
  const started = useGameStore((s) => s.started);
  const paused = useGameStore((s) => s.paused);
  const feverActive = useGameStore((s) => s.feverActive);
  const feverLeft = useGameStore((s) => s.feverLeft);

  return (
    <div className={feverActive ? 'canvas-holder fever' : 'canvas-holder'}>
      <canvas id="game" ref={canvasRef} width={BOARD_W} height={BOARD_H}></canvas>
      {feverActive && (
        <div className="fever-banner" aria-live="polite">
          🔥 FEVER ×{FEVER_SCORE_MULT} · {feverLeft}초
        </div>
      )}
      {feverActive && (
        <div className="fever-bar" aria-hidden="true">
          <i style={{ width: `${Math.min(100, (feverLeft / FEVER_DURATION_SEC) * 100)}%` }} />
        </div>
      )}
      {!started && <StartOverlay onStart={onStart} />}
      {over && (
        <GameOverOverlay
          score={score}
          onRestart={onRestart}
          onOpenLeaderboard={onOpenLeaderboard}
          onDownloadShot={onDownloadShot}
        />
      )}
      {paused && !over && started && <PauseOverlay onResume={onTogglePause} />}
      <Toast />
    </div>
  );
}
