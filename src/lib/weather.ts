// MVP: 더미 데이터. 추후 기상청 getVilageFcst API + 위경도→격자좌표(nx, ny) 변환 로직으로 교체 예정.
export interface WeatherStatus {
  heatWaveAlert: boolean;
  feelsLikeC: number;
  recommendation: string;
}

export function getDummyWeatherStatus(): WeatherStatus {
  return {
    heatWaveAlert: true,
    feelsLikeC: 34,
    recommendation: "오전 9시 이전, 오후 6시 이후 외출을 추천해요",
  };
}
