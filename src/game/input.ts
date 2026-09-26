/* 캔버스 입력 바인딩 — DOM 리스너 등록/해제만 담당, 게임 판단은 콜백으로 위임 */

import { BOARD_W } from './config/board';

export interface GameInputHandlers {
  isOver(): boolean;
  setDropX(clientX: number): void;
  /** 클릭·터치·Space/Enter — 시작 전이면 시작, 아니면 낙하 */
  tap(): void;
  nudge(dir: -1 | 1): void;
  shake(): void;
  restart(): void;
  togglePause(): void;
  hide(): void;
}

export function clientXToBoard(canvas: HTMLCanvasElement, clientX: number): number {
  const r = canvas.getBoundingClientRect();
  return ((clientX - r.left) / r.width) * BOARD_W;
}

export function handleGameKey(e: KeyboardEvent, h: GameInputHandlers): void {
  const editing = e.target instanceof HTMLElement && !!e.target.closest('input, textarea, [contenteditable="true"]');
  if (h.isOver()) {
    if (e.code === 'Space' && !editing) e.preventDefault();
    return;
  }
  if (editing) return;
  if (
    e.code === 'ArrowLeft' ||
    e.code === 'ArrowRight' ||
    e.code === 'ArrowUp' ||
    e.code === 'ArrowDown' ||
    e.code === 'Space'
  )
    e.preventDefault();
  if (e.code === 'ArrowLeft') h.nudge(-1);
  if (e.code === 'ArrowRight') h.nudge(1);
  if (e.code === 'Space' || e.key === 'Enter') {
    (document.activeElement as HTMLElement | null)?.blur?.();
    h.tap();
  }
  if (e.key === 'r' || e.key === 'R') h.restart();
  if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'KeyS') h.shake();
  if (e.code === 'KeyP' || e.code === 'Escape') h.togglePause();
}

export function attachGameInput(canvas: HTMLCanvasElement, h: GameInputHandlers): () => void {
  const onMove = (e: MouseEvent): void => {
    if (h.isOver()) return;
    h.setDropX(e.clientX);
  };
  const onDown = (e: MouseEvent): void => {
    if (h.isOver()) return;
    h.setDropX(e.clientX);
    h.tap();
  };
  const onTouchStart = (e: TouchEvent): void => {
    if (h.isOver()) return;
    const t = e.touches[0];
    if (t) h.setDropX(t.clientX);
  };
  const onTouchMove = (e: TouchEvent): void => {
    if (h.isOver()) return;
    const t = e.touches[0];
    if (t) h.setDropX(t.clientX);
    e.preventDefault();
  };
  const onTouchEnd = (): void => {
    if (h.isOver()) return;
    h.tap();
  };
  const onKey = (e: KeyboardEvent): void => handleGameKey(e, h);
  const onVis = (): void => {
    if (document.hidden) h.hide();
  };

  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('touchstart', onTouchStart, { passive: true });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVis);
  return () => {
    canvas.removeEventListener('mousemove', onMove);
    canvas.removeEventListener('mousedown', onDown);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVis);
  };
}
