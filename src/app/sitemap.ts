import type { MetadataRoute } from "next";
import { siteConfig } from "./site-config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteConfig.url}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${siteConfig.url}/how-it-works/`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteConfig.url}/plugins/`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
