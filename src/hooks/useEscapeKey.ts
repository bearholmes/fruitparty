import { useEffect } from 'react';

/* 캡처 단계 Escape 처리 — 게임 키 입력보다 먼저 가로챔 */
export function useEscapeKey(active: boolean, onEscape: () => void, blockAllKeys = false): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape();
      }
      if (blockAllKeys || event.key === 'Escape') event.stopImmediatePropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active, onEscape, blockAllKeys]);
}
