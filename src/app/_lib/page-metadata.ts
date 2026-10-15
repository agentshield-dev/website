import type { Metadata } from "next";
import { siteConfig } from "../site-config";

// Social cards live next to the layout as opengraph-image.png and twitter-image.png. A page that sets
// openGraph or twitter replaces the layout's objects wholesale, which drops the file-convention images,
// so each page restates them here with the stable, unhashed URLs.
const socialAlt = "agentshield: assume every attacker is an agent. Open source defense against lateral movement.";

export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const fullTitle = `${title} | ${siteConfig.name}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: "website",
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: socialAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [{ url: "/twitter-image.png", width: 1200, height: 630, alt: socialAlt }],
    },
  };
}
