import { Pause, Play } from 'lucide-react';

export function PauseOverlay({ onResume }: { onResume: () => void }) {
  return (
    <div className="overlay">
      <div className="card">
        <div className="card-icon">
          <Pause size={48} />
        </div>
        <h2>일시정지</h2>
        <button className="btn big" onClick={onResume}>
          <Play size={20} /> 계속하기
        </button>
      </div>
    </div>
  );
}
