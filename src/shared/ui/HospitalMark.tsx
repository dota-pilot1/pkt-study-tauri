import { useId } from "react";

/**
 * 여의도 튼튼척의원 심볼.
 *
 * 웹 프론트 HospitalLogo 의 2×2 워드마크는 44px 아래로 줄이면 네 타일이 뭉개져서,
 * 파비콘(front/src/app/icon.svg)과 같은 축약형 — 타일 한 장에 측면 척추 — 을 쓴다.
 * 색은 CSS 변수를 타므로 테마를 바꿔도 따라온다.
 *
 * inverted: 파란 레일 위처럼 배경이 이미 브랜드색일 때 흰 타일 + 브랜드색 척추로 뒤집는다.
 */
function HospitalMark({ className = "", inverted = false }: { className?: string; inverted?: boolean }) {
  const gradientId = useId();
  const tile = inverted ? "var(--primary-foreground)" : `url(#${gradientId})`;
  const stroke = inverted ? "var(--primary)" : "var(--primary-foreground)";

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="color-mix(in srgb, var(--primary) 88%, white)" />
          <stop offset="1" stopColor="color-mix(in srgb, var(--primary) 88%, black)" />
        </linearGradient>
      </defs>

      {/* color-mix 그라디언트를 못 그리는 웹뷰에서도 타일 색은 남도록 단색을 깔아 둔다. */}
      <rect width="48" height="48" rx="12" fill={inverted ? "var(--primary-foreground)" : "var(--primary)"} />
      <rect width="48" height="48" rx="12" fill={tile} />

      <g transform="translate(-1 0)" fill="none" stroke={stroke} strokeLinecap="round">
        {/* 척추 기둥 */}
        <path d="M18 9.5c3.4 4.8 3.4 9.6 0 14.4s-3.4 9.8 0 14.6" strokeWidth="7" />
        {/* 마디 셋 */}
        <path d="M25 14.5h8M25.8 24h8M25 33.5h8" strokeWidth="5" />
      </g>
    </svg>
  );
}

export default HospitalMark;
