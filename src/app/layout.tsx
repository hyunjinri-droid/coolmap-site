import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import AdSenseScript from "@/components/AdSenseScript";

const SITE_URL = "https://cool.babyfairschedule.co.kr";
const TITLE = "쿨맵 | 여름 나들이 그늘·쉼터·수변공간 지도";
const DESCRIPTION =
  "유모차와 함께하는 여름 나들이, 가장 가까운 그늘·쉼터·수변공간을 찾아 길찾기까지 한 번에.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  verification: {
    google: "yDX0ROR88DL0J5zK8U7iQJvqbPFotC8hBxkZ0pG4L6w",
    other: { "naver-site-verification": "1d4bb8fd9f21832da642895e11f4e4c24c540afc" },
  },
  title: {
    default: TITLE,
    template: "%s | 쿨맵",
  },
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "쿨맵",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <AdSenseScript />
      </body>
    </html>
  );
}
