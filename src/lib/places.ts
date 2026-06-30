import dummyPlaces from "@/data/places.json";
import realShelters from "@/data/shelters.json";
import realShades from "@/data/shades.json";
import type { Place } from "./types";

// shelters.json/shades.json (실데이터)이 채워지면 해당 카테고리의 더미 항목은
// 빼고 실데이터로 대체한다. 수변공간은 아직 더미 데이터를 사용한다.
export function getAllPlaces(): Place[] {
  const shelters = realShelters as Place[];
  const shades = realShades as Place[];
  const dummy = dummyPlaces as Place[];

  const replacedCategories = new Set<Place["category"]>();
  if (shelters.length > 0) replacedCategories.add("shelter");
  if (shades.length > 0) replacedCategories.add("shade");

  const remainingDummy = dummy.filter((p) => !replacedCategories.has(p.category));

  return [...shelters, ...shades, ...remainingDummy];
}
