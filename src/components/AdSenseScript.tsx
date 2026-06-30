import Script from "next/script";

// 기존 babyfairschedule.co.kr AdSense 계정 재사용.
// 서브도메인(cool.babyfairschedule.co.kr)을 AdSense 콘솔에 추가 등록해야 노출된다.
const ADSENSE_CLIENT_ID = "ca-pub-2284090720087182";

export default function AdSenseScript() {
  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
