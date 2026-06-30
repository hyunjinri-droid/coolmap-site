import type { Place } from "./types";

export function kakaoMapLink(place: Place): string {
  const name = encodeURIComponent(place.name);
  return `https://map.kakao.com/link/to/${name},${place.lat},${place.lng}`;
}

export function naverMapLink(place: Place): string {
  const name = encodeURIComponent(place.name);
  return `https://map.naver.com/v5/directions/-/-/walk?dlevel=0&pathType=0&c=${place.lng},${place.lat},15,0,0,0,dh&destination=${place.lng},${place.lat},${name}`;
}
