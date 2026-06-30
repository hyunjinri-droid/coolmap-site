import type { Metadata } from "next";
import CoolMapApp from "@/components/CoolMapApp";
import guCenters from "@/data/gu-centers.json";

export function generateStaticParams() {
  return guCenters.map(({ gu }) => ({ name: gu }));
}

export function generateMetadata({ params }: { params: { name: string } }): Metadata {
  const gu = decodeURIComponent(params.name);
  return {
    title: `${gu} 그늘·쉼터·수변공간 지도`,
    description: `${gu}에서 가까운 무더위쉼터, 그늘막, 수변공간을 찾아 길찾기까지 한 번에.`,
  };
}

export default function GuPage({ params }: { params: { name: string } }) {
  const gu = decodeURIComponent(params.name);
  return <CoolMapApp gu={gu} />;
}
