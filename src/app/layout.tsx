import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "쿨맵 | 여름 나들이 그늘·쉼터·수변공간 지도",
  description: "유모차와 함께하는 여름 나들이, 가장 가까운 그늘·쉼터·수변공간을 찾아 길찾기까지 한 번에.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
