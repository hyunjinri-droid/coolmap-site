import type { WeatherStatus } from "@/lib/weather";

export default function StatusBadge({ status }: { status: WeatherStatus }) {
  return (
    <div className={`status-badge${status.heatWaveAlert ? " alert" : ""}`}>
      {status.heatWaveAlert && <span className="status-badge-tag">폭염특보</span>}
      <span className="status-badge-temp">체감 {status.feelsLikeC}°C</span>
      <span className="status-badge-rec">{status.recommendation}</span>
    </div>
  );
}
