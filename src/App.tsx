import { useCallback, useEffect, useRef, useState } from 'react';
import type { LeaderboardPeriod } from './game/leaderboard';
import { useGameStore } from './game/store';
import { useSuika } from './game/useSuika';
import { CanvasHolder } from './components/CanvasHolder';
import { Controls } from './components/Controls';
import { LeaderboardDialog } from './components/LeaderboardDialog';
import { ScoreHeader } from './components/ScoreHeader';
import { SidePanel } from './components/SidePanel';
import { useEscapeKey } from './hooks/useEscapeKey';

export default function App() {
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [activeLeaderboard, setActiveLeaderboard] = useState<LeaderboardPeriod>('daily');
  const pausedByMenu = useRef(false);
  const pausedByLeaderboard = useRef(false);
  const {
    canvasRef,
    nextCanvasRef,
    drop,
    restart,
    shake,
    start,
    togglePause,
    moveLeft,
    moveRight,
  } = useSuika();
  const over = useGameStore((s) => s.over);
  const refreshLeaderboard = useGameStore((s) => s.refreshLeaderboard);
  const loadAudioSettings = useGameStore((s) => s.loadAudioSettings);

  useEffect(() => {
    loadAudioSettings();
  }, [loadAudioSettings]);

  const openPanel = useCallback(() => {
    const game = useGameStore.getState();
    pausedByMenu.current = game.started && !game.paused && !game.over;
    if (pausedByMenu.current) game.setPaused(true);
    setMobilePanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setMobilePanelOpen(false);
    const game = useGameStore.getState();
    if (pausedByMenu.current && game.paused && !game.over) game.setPaused(false);
    pausedByMenu.current = false;
  }, []);

  const openLeaderboard = useCallback(() => {
    const game = useGameStore.getState();
    pausedByLeaderboard.current = game.started && !game.paused && !game.over;
    if (pausedByLeaderboard.current) game.setPaused(true);
    setLeaderboardOpen(true);
    void game.refreshLeaderboard();
  }, []);

  const closeLeaderboard = useCallback(() => {
    setLeaderboardOpen(false);
    const game = useGameStore.getState();
    if (pausedByLeaderboard.current && game.paused && !game.over) game.setPaused(false);
    pausedByLeaderboard.current = false;
  }, []);

  useEffect(() => {
    void refreshLeaderboard();
  }, [over, refreshLeaderboard]);

  const downloadShot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { score, best } = useGameStore.getState();
    const W = canvas.width,
      H = canvas.height,
      PAD = 84;
    const out = document.createElement('canvas');
    out.width = W;
    out.height = H + PAD;
    const c = out.getContext('2d');
    if (!c) return;
    c.fillStyle = '#fffdf7';
    c.fillRect(0, 0, out.width, out.height);
    c.drawImage(canvas, 0, 0);
    c.fillStyle = '#3d2b1f';
    c.font = '800 34px Jua, sans-serif';
    c.textAlign = 'center';
    c.fillText(`SCORE ${score} · BEST ${best}`, W / 2, H + 56);
    const a = document.createElement('a');
    a.download = `fruitparty-${score}.png`;
    a.href = out.toDataURL('image/png');
    a.click();
  }, [canvasRef]);

  useEscapeKey(mobilePanelOpen, closePanel);
  useEscapeKey(leaderboardOpen, closeLeaderboard, true);

  return (
    <>
      <main className="layout">
        <section className="board-wrap">
          <ScoreHeader
            nextCanvasRef={nextCanvasRef}
            onTogglePause={togglePause}
            onOpenPanel={openPanel}
            onOpenLeaderboard={openLeaderboard}
            mobilePanelOpen={mobilePanelOpen}
          />
          <CanvasHolder
            canvasRef={canvasRef}
            onStart={start}
            onRestart={restart}
            onTogglePause={togglePause}
            onOpenLeaderboard={openLeaderboard}
            onDownloadShot={downloadShot}
          />
          <Controls
            onDrop={drop}
            onShake={shake}
            onMoveLeft={moveLeft}
            onMoveRight={moveRight}
          />
        </section>

        {mobilePanelOpen && <div className="mobile-backdrop" onClick={closePanel} />}
        <SidePanel open={mobilePanelOpen} onClose={closePanel} onRestart={restart} />
        {leaderboardOpen && (
          <LeaderboardDialog
            active={activeLeaderboard}
            onTabChange={setActiveLeaderboard}
            onClose={closeLeaderboard}
          />
        )}
      </main>
    </>
  );
}
