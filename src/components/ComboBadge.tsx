import { memo } from 'react';

/* 콤보 배지 — key 리마운트로 pop 애니메이션을 리트리거.
   App 전체가 아닌 이 작은 서브트리만 다시 마운트되도록 격리 */
function ComboBadgeInner({ combo }: { combo: number }) {
  return (
    <div className={combo >= 5 ? 'combo hot' : 'combo'} key={combo} aria-label={`콤보 ${combo}`}>
      <span>COMBO</span>
      <strong>×{combo}</strong>
    </div>
  );
}

export const ComboBadge = memo(ComboBadgeInner);
