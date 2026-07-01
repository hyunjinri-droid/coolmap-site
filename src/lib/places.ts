import dummyPlaces from "@/data/places.json";
import realShelters from "@/data/shelters.json";
import realShades from "@/data/shades.json";
import realWaters from "@/data/waters.json";
import type { Place } from "./types";

export function getAllPlaces(): Place[] {
  const shelters = realShelters as Place[];
  const shades = realShades as Place[];
  const waters = realWaters as Place[];
  const dummy = dummyPlaces as Place[];

  const replacedCategories = new Set<Place["category"]>();
  if (shelters.length > 0) replacedCategories.add("shelter");
  if (shades.length > 0) replacedCategories.add("shade");
  if (waters.length > 0) replacedCategories.add("water");

  const remainingDummy = dummy.filter((p) => !replacedCategories.has(p.category));

  return [...shelters, ...shades, ...waters, ...remainingDummy];
}
