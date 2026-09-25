import { useCallback, useEffect } from 'react';
import {
  ArrowDownToLine,
  Camera,
  Cherry,
  ChevronLeft,
  ChevronRight,
  Flame,
  Frown,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Vibrate,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { FRUITS } from './game/art';
import { useGameStore } from './game/store';
import { useSuika } from './game/useSuika';

export default function App() {
  const { canvasRef, nextCanvasRef, drop, restart, shake, start, togglePause, moveLeft, moveRight } =
    useSuika();
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

  const downloadShot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width, H = canvas.height, PAD = 84;
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

  /* 데스크톱 2열 레이아웃에서 캔버스를 뷰포트 높이에 정확히 맞춤.
     크롬(헤드·컨트롤·여백) 실측 기반이라 매직넘버 불일치가 없음. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const holder = canvas.parentElement;
    const wrap = holder?.parentElement;
    if (!holder || !wrap) return;
    const fit = (): void => {
      if (window.innerWidth < 861) {
        holder.style.removeProperty('--cw');
        return;
      }
      const chrome = wrap.offsetHeight - holder.offsetHeight;
      const top = wrap.getBoundingClientRect().top;
      const availH = window.innerHeight - top - chrome - 18; // 끝자리 반올림 스크롤 방지 2px 여유
      const w = Math.max(360, Math.min(480, Math.floor(availH * (480 / 660))));
      holder.style.setProperty('--cw', `${w}px`);
    };
    fit();
    window.addEventListener('resize', fit);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => window.removeEventListener('resize', fit);
  }, [canvasRef]);

  return (
    <>
      <div className="bg-fruits" aria-hidden="true">
        🍒🍋🫐🍑🍊🍎🍐🍇🍈🟠
      </div>

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
            <div className="next-pill">
              NEXT <canvas id="nextCanvas" ref={nextCanvasRef} width="96" height="96"></canvas>
            </div>
          </div>
          <div className="canvas-holder">
            <canvas id="game" ref={canvasRef} width="480" height="660"></canvas>
            {!started && (
              <div className="overlay">
                <div className="card">
                  <div className="card-icon">
                    <Cherry size={48} />
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
                  <p>쉬는 중이에요</p>
                  <button className="btn big" onClick={togglePause}>
                    <Play size={20} /> 계속하기 (P)
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
              DROP <ArrowDownToLine size={20} />
            </button>
            <button className="btn round" onClick={moveRight} aria-label="오른쪽으로 이동">
              <ChevronRight size={22} />
            </button>
            <button
              className="btn"
              onClick={shake}
              disabled={!canShake || busy || (danger && dangerShakeLeft <= 0)}
              title="박스를 흔듭니다 (↑/↓)"
            >
              <Vibrate size={18} /> {danger ? `흔들기 ${dangerShakeLeft}` : '흔들기'}
            </button>
          </div>
        </section>

        <aside className="side">
          <div className="sysbar">
            <button className="btn sm" onClick={togglePause} disabled={over || !started}>
              {paused ? <Play size={15} /> : <Pause size={15} />} 일시정지
            </button>
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
          <div className="panel combo-panel">
            <h3>콤보</h3>
            <div className={combo >= 5 ? 'combo hot' : 'combo'} key={combo}>
              <Flame size={40} />x{combo}
            </div>
          </div>
        </aside>
      </main>
    </>
  );
}
