import dummyPlaces from "@/data/places.json";
import realShelters from "@/data/shelters.json";
import type { Place } from "./types";

// shelters.json (생활안전지도 실데이터)이 채워지면 더미 쉼터 항목은 빼고
// 실데이터로 대체한다. 그늘막/수변공간은 아직 더미 데이터를 사용한다.
export function getAllPlaces(): Place[] {
  const shelters = realShelters as Place[];
  const dummy = dummyPlaces as Place[];

  if (shelters.length === 0) return dummy;

  const nonShelterDummy = dummy.filter((p) => p.category !== "shelter");
  return [...shelters, ...nonShelterDummy];
}
