import { Play } from 'lucide-react';

export function StartOverlay({ onStart }: { onStart: () => void }) {
  return (
    <div className="overlay">
      <div className="card start-card">
        <img
          className="intro-image"
          src="/intro-fruit-basket.webp"
          alt="과일이 담긴 전통 바구니"
        />
        <h2>과실 잔치</h2>
        <div className="start-how">← → 이동 · 클릭 / Space 낙하 · ↑↓ 흔들기</div>
        <button className="btn big" onClick={onStart}>
          <Play size={20} /> 시작하기
        </button>
      </div>
    </div>
  );
}
