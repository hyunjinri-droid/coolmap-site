export type PlaceCategory = "shelter" | "shade" | "water";

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  city: string;
  gu: string;
  address: string;
  lat: number;
  lng: number;
  hours?: string;
  familyFriendly: boolean;
  note?: string;
}
