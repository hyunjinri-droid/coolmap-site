import type { MetadataRoute } from "next";
import guCenters from "@/data/gu-centers.json";

const SITE_URL = "https://cool.babyfairschedule.co.kr";

export default function sitemap(): MetadataRoute.Sitemap {
  const guPages = guCenters.map(({ gu }) => ({
    url: `${SITE_URL}/gu/${encodeURIComponent(gu)}/`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    ...guPages,
  ];
}
