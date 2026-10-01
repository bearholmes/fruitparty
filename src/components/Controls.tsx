import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useGameStore } from '../game/store';

interface ControlsProps {
  onDrop: () => void;
  onShake: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}

export function Controls({ onDrop, onShake, onMoveLeft, onMoveRight }: ControlsProps) {
  const over = useGameStore((s) => s.over);
  const paused = useGameStore((s) => s.paused);
  const started = useGameStore((s) => s.started);
  const canShake = useGameStore((s) => s.canShake);
  const danger = useGameStore((s) => s.danger);
  const dangerShakeLeft = useGameStore((s) => s.dangerShakeLeft);
  const simpleControls = useGameStore((s) => s.simpleControls);
  const busy = over || paused || !started;

  return (
    <div className={simpleControls ? 'controls simple' : 'controls'}>
      {!simpleControls && (
        <button className="btn round" onClick={onMoveLeft} aria-label="왼쪽으로 이동">
          <ChevronLeft size={22} />
        </button>
      )}
      {!simpleControls && (
        <button className="btn big" onClick={onDrop} disabled={busy}>
          DROP
        </button>
      )}
      <button
        className="btn shake"
        onClick={onShake}
        disabled={!canShake || busy || (danger && dangerShakeLeft <= 0)}
        title="박스를 흔듭니다 (↑/↓)"
      >
        {danger ? `흔들기 ${dangerShakeLeft}` : '흔들기'}
      </button>
      {!simpleControls && (
        <button className="btn round" onClick={onMoveRight} aria-label="오른쪽으로 이동">
          <ChevronRight size={22} />
        </button>
      )}
    </div>
  );
}
