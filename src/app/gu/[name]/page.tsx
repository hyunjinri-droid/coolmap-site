import CoolMapApp from "@/components/CoolMapApp";
import placesData from "@/data/places.json";
import type { Place } from "@/lib/types";

export function generateStaticParams() {
  const gus = Array.from(new Set((placesData as Place[]).map((p) => p.gu)));
  return gus.map((name) => ({ name }));
}

export default function GuPage({ params }: { params: { name: string } }) {
  const gu = decodeURIComponent(params.name);
  return <CoolMapApp gu={gu} />;
}
