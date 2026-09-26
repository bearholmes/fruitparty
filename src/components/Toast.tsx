import { useGameStore } from '../game/store';

export function Toast() {
  const toast = useGameStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="toast" key={toast.key}>
      {toast.msg}
    </div>
  );
}
