# 쿨맵 (Coolmap)

여름철 그늘·쉼터·수변공간을 찾아 길찾기까지 한 번에 연결하는 지도 서비스 MVP.

## 현재 상태

- Next.js 14 (정적 export) + Leaflet/OSM 기반 지도
- 더미 데이터(`src/data/places.json`) 5개 구 일부 장소
- 카카오맵/네이버지도 길찾기 딥링크 연결
- 폭염특보/체감온도 상태 배지는 더미 값 (`src/lib/weather.ts`)
- 구별 페이지: `/gu/[구이름]/`

## 다음 단계 (설계문서 8장 참고)

1. 공공데이터포털/서울 열린데이터광장 실데이터 연동
2. 기상청 단기예보 API + 위경도→격자좌표 변환
3. GitHub Actions 데이터 빌드 자동화
4. Cloudflare Pages `cool.babyfairschedule.co.kr` 배포 연결
5. AdSense/Google Ads 캠페인 확장

## 개발

```bash
npm install
npm run dev
npm run build   # 정적 export -> out/
```
