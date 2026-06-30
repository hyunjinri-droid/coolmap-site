import weatherData from "@/data/weather.json";

export interface WeatherStatus {
  heatWaveAlert: boolean;
  feelsLikeC: number;
  recommendation: string;
}

interface WeatherItem {
  gu: string;
  tmp: number;
  reh: number;
  feelsLikeC: number;
  heatWaveAlert: boolean;
  recommendation: string;
}

const FALLBACK_STATUS: WeatherStatus = {
  heatWaveAlert: true,
  feelsLikeC: 34,
  recommendation: "오전 9시 이전, 오후 6시 이후 외출을 추천해요",
};

// scripts/fetch-weather.mjs가 GitHub Actions에서 주기 실행되며
// src/data/weather.json을 기상청 getVilageFcst 데이터로 채운다.
// 아직 데이터가 빌드되지 않았다면(KMA_API_KEY 미설정 등) FALLBACK_STATUS를 사용한다.
export function getWeatherStatus(gu?: string): WeatherStatus {
  const items = (weatherData as { items: WeatherItem[] }).items;
  if (!items || items.length === 0) return FALLBACK_STATUS;

  const found = gu ? items.find((i) => i.gu === gu) : undefined;
  const item = found ?? items[0];

  return {
    heatWaveAlert: item.heatWaveAlert,
    feelsLikeC: item.feelsLikeC,
    recommendation: item.recommendation,
  };
}
