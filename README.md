# 쿨맵 (Coolmap)

여름철 그늘·쉼터·수변공간을 찾아 길찾기까지 한 번에 연결하는 지도 서비스 MVP.

## 현재 상태

- Next.js 14 (정적 export) + Leaflet/OSM 기반 지도
- 더미 데이터(`src/data/places.json`) 5개 구 일부 장소
- 카카오맵/네이버지도 길찾기 딥링크 연결
- 폭염특보/체감온도 상태 배지는 더미 값 (`src/lib/weather.ts`)
- 구별 페이지: `/gu/[구이름]/`

- 기상청 격자좌표 변환(`src/lib/kmaGrid.ts`) + `getVilageFcst` 연동 빌드 스크립트(`scripts/fetch-weather.mjs`)
  - 구별 체감온도는 기온+습도 기반 Heat Index 근사치(정밀 체감온도 API로 추후 교체 가능)
  - `KMA_API_KEY` 환경변수 없으면 자동으로 더미 데이터 폴백
- Cloudflare Pages 배포 설정(`wrangler.toml`, `.github/workflows/deploy.yml`)

## 배포/자동화에 필요한 시크릿 (Cloudflare 계정 보유자가 등록)

GitHub 저장소 Settings → Secrets and variables → Actions 에 등록:

| 시크릿 | 용도 |
|---|---|
| `KMA_API_KEY` | 공공데이터포털 기상청 단기예보 API 인증키. 없으면 `weather.yml`이 건너뜀 |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Pages 배포 권한 토큰 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 계정 ID |

Cloudflare 대시보드에서 `coolmap-site` Pages 프로젝트를 미리 생성하고
`cool.babyfairschedule.co.kr` 커스텀 도메인을 연결해야 `deploy.yml`이 정상 동작합니다.

- `.github/workflows/weather.yml`: 3시간마다 기상 데이터 갱신 후 커밋
- `.github/workflows/deploy.yml`: `main` 브랜치 push 시 Cloudflare Pages 배포

## 다음 단계 (설계문서 8장 참고)

1. 공공데이터포털/서울 열린데이터광장 실데이터(쉼터/그늘막/수변공간) 연동 스크립트 작성
2. 위 시크릿 등록 후 실제 Cloudflare Pages 배포 연결 확인
3. AdSense/Google Ads 캠페인 확장

## 개발

```bash
npm install
npm run dev
npm run build   # 정적 export -> out/
```
