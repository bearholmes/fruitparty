import { RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { FRUITS } from '../game/fruits';
import { previewBgm } from '../game/bgm';
import { sfx } from '../game/sfx';
import { useGameStore } from '../game/store';

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  onRestart: () => void;
}

export function SidePanel({ open, onClose, onRestart }: SidePanelProps) {
  const restartDisabled = useGameStore((s) => s.submittingLeaderboard || (s.over && s.leaderboardStatus === 'loading'));
  const evoUrls = useGameStore((s) => s.evoUrls);
  const soundOn = useGameStore((s) => s.soundOn);
  const bgmVolume = useGameStore((s) => s.bgmVolume);
  const sfxVolume = useGameStore((s) => s.sfxVolume);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const setBgmVolume = useGameStore((s) => s.setBgmVolume);
  const setSfxVolume = useGameStore((s) => s.setSfxVolume);

  return (
    <aside id="mobile-panel" className={`side${open ? ' open' : ''}`}>
      <div className="mobile-layer-head">
        <button className="btn" onClick={onClose} aria-label="메뉴 닫기">
          <X size={20} />
        </button>
      </div>
      <div className="sysbar">
        <button className="btn sm" onClick={toggleSound} aria-pressed={soundOn}>
          {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />} 소리 {soundOn ? 'ON' : 'OFF'}
        </button>
        <button className="btn sm" onClick={onRestart} disabled={restartDisabled}>
          <RotateCcw size={15} /> 다시 시작
        </button>
      </div>
      <div className="panel">
        <h3>소리 조절</h3>
        <label className="audio-control">
          <span>배경음악</span>
          <input type="range" min="0" max="100" value={Math.round(bgmVolume * 100)}
            onChange={(event) => {
              setBgmVolume(Number(event.target.value) / 100);
              previewBgm();
            }} />
          <output>{Math.round(bgmVolume * 100)}%</output>
        </label>
        <label className="audio-control">
          <span>효과음</span>
          <input type="range" min="0" max="100" value={Math.round(sfxVolume * 100)}
            onChange={(event) => setSfxVolume(Number(event.target.value) / 100)}
            onPointerUp={() => sfx.ui()}
            onKeyUp={() => sfx.ui()} />
          <output>{Math.round(sfxVolume * 100)}%</output>
        </label>
      </div>
      <div className="panel">
        <h3>
          과실 도감 <small>10단계</small>
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
            같은 과일 2개가 잠시 맞닿아 있으면 <b>상위 과일 1개</b>로 합쳐져요.
          </li>
          <li>
            빨간 선 위에 과일이 <b>3초</b> 쌓이면 게임오버.
          </li>
          <li>
            단감 2개가 만나면 폭발 + <b>30초 피버타임</b>(점수 3배·주변 정리)!
          </li>
          <li>
            떨어질 과일은 <b>1~5단계</b> 중 랜덤.
          </li>
          <li>
            <b>↑↓</b> 키로 박스 흔들기 (2초 쿨다운, 피버 중 1초·강화).
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
  );
}
