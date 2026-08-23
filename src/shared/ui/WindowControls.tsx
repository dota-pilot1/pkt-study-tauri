import { getCurrentWindow } from "@tauri-apps/api/window";

// 참조앱과 동일하게, 네이티브 신호등 대신 공용 헤더에서 창 조작을 제공한다.
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const windowControlClass =
  "flex size-8 items-center justify-center rounded-md border border-transparent text-text-muted transition-colors hover:border-surface-border-soft hover:bg-surface-muted hover:text-text-primary";

function WindowControls() {
  if (!isTauri) return null;
  const win = getCurrentWindow();

  return (
    <div className="flex shrink-0 items-center gap-1" data-no-drag>
      <button
        type="button"
        onClick={() => void win.minimize()}
        title="최소화"
        aria-label="최소화"
        className={windowControlClass}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
          <line x1="2.5" y1="6" x2="9.5" y2="6" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => void win.toggleMaximize()}
        title="최대화 / 복원"
        aria-label="최대화 / 복원"
        className={windowControlClass}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="2.5" y="2.5" width="7" height="7" rx="1.5" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => void win.close()}
        title="닫기"
        aria-label="닫기"
        className={`${windowControlClass} hover:border-destructive hover:bg-destructive hover:text-destructive-foreground`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
          <line x1="3" y1="3" x2="9" y2="9" strokeLinecap="round" />
          <line x1="9" y1="3" x2="3" y2="9" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export default WindowControls;
