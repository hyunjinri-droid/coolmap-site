"use client";

import { useEffect, useRef } from "react";

export default function KakaoAdFit() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "//t1.kakaocdn.net/kas/static/ba.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div ref={ref} style={{ textAlign: "center", margin: "12px auto", padding: "4px 0" }}>
      <ins
        className="kakao_ad_area"
        style={{ display: "none" }}
        data-ad-unit="DAN-Bkb2joHhKt3XdDYR"
        data-ad-width="320"
        data-ad-height="50"
      />
    </div>
  );
}
