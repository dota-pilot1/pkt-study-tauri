import type { MouseEvent } from "react";

function ColumnResizeHandle({ onMouseDown }: { onMouseDown: (event: MouseEvent) => void }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={onMouseDown}
      title="너비 조절"
      className="group relative z-10 hidden w-3 shrink-0 cursor-col-resize select-none xl:block"
    >
      <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-surface-border-soft transition-colors group-hover:bg-brand-primary" />
    </div>
  );
}

export default ColumnResizeHandle;
