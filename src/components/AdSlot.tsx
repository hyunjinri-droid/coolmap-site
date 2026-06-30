"use client";

import { useEffect, useRef } from "react";

const ADSENSE_CLIENT_ID = "ca-pub-2284090720087182";

interface AdSlotProps {
  // AdSense 콘솔에서 발급받는 광고 단위 슬롯 ID. 미정이라 비워두고
  // 발급 후 이 prop을 채워 사용한다.
  slotId?: string;
  className?: string;
}

export default function AdSlot({ slotId, className }: AdSlotProps) {
  const ref = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!slotId) return;
    try {
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle =
        (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle || [];
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle.push({});
    } catch {
      // AdSense 스크립트 로드 전이거나 차단된 경우 조용히 무시
    }
  }, [slotId]);

  if (!slotId) return null;

  return (
    <ins
      ref={ref}
      className={`adsbygoogle${className ? ` ${className}` : ""}`}
      style={{ display: "block" }}
      data-ad-client={ADSENSE_CLIENT_ID}
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
