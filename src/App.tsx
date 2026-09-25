import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Frown,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { FRUITS } from './game/art';
import { useGameStore } from './game/store';
import { useSuika } from './game/useSuika';

export default function App() {
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const pausedByMenu = useRef(false);
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
  const score = useGameStore((s) => s.score);
  const best = useGameStore((s) => s.best);
  const combo = useGameStore((s) => s.combo);
  const over = useGameStore((s) => s.over);
  const started = useGameStore((s) => s.started);
  const paused = useGameStore((s) => s.paused);
  const isRecord = useGameStore((s) => s.isRecord);
  const toast = useGameStore((s) => s.toast);
  const evoUrls = useGameStore((s) => s.evoUrls);
  const soundOn = useGameStore((s) => s.soundOn);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const canShake = useGameStore((s) => s.canShake);
  const danger = useGameStore((s) => s.danger);
  const dangerShakeLeft = useGameStore((s) => s.dangerShakeLeft);

  const busy = over || paused || !started;

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

  const downloadShot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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
  }, [canvasRef, score, best]);

  useEffect(() => {
    if (!mobilePanelOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      closePanel();
    };
    window.addEventListener('keydown', closeOnEscape, true);
    return () => window.removeEventListener('keydown', closeOnEscape, true);
  }, [mobilePanelOpen, closePanel]);

  return (
    <>
      <main className="layout">
        <section className="board-wrap">
          <div className="board-head">
            <div className="scores">
              <div className="score-box">
                <span>SCORE</span>
                <strong>{score}</strong>
              </div>
              <div className="score-box best">
                <span>BEST</span>
                <strong>{best}</strong>
              </div>
            </div>
            <div
              className={combo >= 5 ? 'combo hot' : 'combo'}
              key={combo}
              aria-label={`콤보 ${combo}`}
            >
              <span>COMBO</span>
              <strong>×{combo}</strong>
            </div>
            <div className="next-pill">
              NEXT <canvas id="nextCanvas" ref={nextCanvasRef} width="96" height="96"></canvas>
            </div>
            <div className="head-actions">
              <button
                className="btn pause-control"
                onClick={togglePause}
                disabled={over || !started}
                aria-label={paused ? '게임 계속하기' : '게임 일시정지'}
              >
                {paused ? <Play size={18} /> : <Pause size={18} />}
              </button>
              <button
                className="btn mobile-info"
                onClick={openPanel}
                aria-label="도감과 메뉴 열기"
                aria-controls="mobile-panel"
                aria-expanded={mobilePanelOpen}
              >
                <BookOpen size={19} />
              </button>
            </div>
          </div>
          <div className="canvas-holder">
            <canvas id="game" ref={canvasRef} width="480" height="660"></canvas>
            {!started && (
              <div className="overlay">
                <div className="card">
                  <div className="card-icon">
                    <img src="/fruits/fruit-09.webp" alt="" />
                  </div>
                  <h2>후르츠파티</h2>
                  <div className="start-how">← → 이동 · 클릭 / Space 낙하 · ↑↓ 흔들기</div>
                  <button className="btn big" onClick={start}>
                    <Play size={20} /> 시작하기
                  </button>
                </div>
              </div>
            )}
            {over && (
              <div className="overlay">
                <div className="card">
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
                  <button className="btn big" onClick={restart}>
                    <RotateCcw size={20} /> 다시 하기 (R)
                  </button>
                  <button className="btn" onClick={downloadShot}>
                    <Camera size={18} /> 기록 저장
                  </button>
                </div>
              </div>
            )}
            {paused && !over && started && (
              <div className="overlay">
                <div className="card">
                  <div className="card-icon">
                    <Pause size={48} />
                  </div>
                  <h2>일시정지</h2>
                  <button className="btn big" onClick={togglePause}>
                    <Play size={20} /> 계속하기
                  </button>
                </div>
              </div>
            )}
            {toast && (
              <div className="toast" key={toast.key}>
                {toast.msg}
              </div>
            )}
          </div>
          <div className="controls">
            <button className="btn round" onClick={moveLeft} aria-label="왼쪽으로 이동">
              <ChevronLeft size={22} />
            </button>
            <button className="btn big" onClick={drop} disabled={busy}>
              DROP
            </button>
            <button
              className="btn shake"
              onClick={shake}
              disabled={!canShake || busy || (danger && dangerShakeLeft <= 0)}
              title="박스를 흔듭니다 (↑/↓)"
            >
              {danger ? `흔들기 ${dangerShakeLeft}` : '흔들기'}
            </button>
            <button className="btn round" onClick={moveRight} aria-label="오른쪽으로 이동">
              <ChevronRight size={22} />
            </button>
          </div>
        </section>

        {mobilePanelOpen && <div className="mobile-backdrop" onClick={closePanel} />}
        <aside id="mobile-panel" className={`side${mobilePanelOpen ? ' open' : ''}`}>
          <div className="mobile-layer-head">
            <button className="btn" onClick={closePanel} aria-label="메뉴 닫기">
              <X size={20} />
            </button>
          </div>
          <div className="sysbar">
            <button className="btn sm" onClick={toggleSound}>
              {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />} 사운드
            </button>
            <button className="btn sm" onClick={restart}>
              <RotateCcw size={15} /> 다시 시작
            </button>
          </div>
          <div className="panel">
            <h3>
              진화 도감 <small>10단계</small>
            </h3>
            <div className="evo">
              {FRUITS.map((f, i) => (
                <div className="evo-item" key={f.name + i}>
                  <span className="evo-dot">
                    {evoUrls[i] && <img alt={f.name} src={evoUrls[i]} />}
                  </span>
                  {i + 1}. {f.name}
                </div>
              ))}
            </div>
          </div>
          <div className="panel how">
            <h3>규칙</h3>
            <ol>
              <li>
                같은 과일 2개가 닿으면 <b>상위 과일 1개</b>로 합쳐져요.
              </li>
              <li>
                빨간 선 위에 과일이 <b>3초</b> 쌓이면 게임오버.
              </li>
              <li>
                단감 2개가 만나면 터지며 <b>보너스</b>!
              </li>
              <li>
                떨어질 과일은 <b>1~5단계</b> 중 랜덤.
              </li>
              <li>
                <b>↑↓</b> 키로 박스 흔들기 (2초 쿨다운).
              </li>
              <li>
                위험 상태에선 흔들기 <b>5회</b> 제한 (해제 후 충전).
              </li>
              <li>
                <b>P</b>·Esc 일시정지, 탭 전환 시 자동 정지.
              </li>
            </ol>
          </div>
        </aside>
      </main>
    </>
  );
}
