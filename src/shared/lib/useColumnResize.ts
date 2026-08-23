import { useCallback, useEffect, useRef } from "react";

/** 마우스로 탐색 컬럼의 너비를 조절한다. */
export function useColumnResize(
  width: number,
  onChange: (width: number) => void,
  { min = 220, max = 560 }: { min?: number; max?: number } = {},
) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(width);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      if (!dragging.current) return;
      onChange(Math.min(max, Math.max(min, startWidth.current + event.clientX - startX.current)));
    };
    const up = () => { dragging.current = false; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [max, min, onChange]);

  return useCallback((event: React.MouseEvent) => {
    dragging.current = true;
    startX.current = event.clientX;
    startWidth.current = width;
    event.preventDefault();
  }, [width]);
}
