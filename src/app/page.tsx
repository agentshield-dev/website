import type { Metadata } from "next";
import { Faq } from "./_components/home/Faq";
import { Findings } from "./_components/home/Findings";
import { GetStarted } from "./_components/GetStarted";
import { Hero } from "./_components/home/Hero";
import { PluginsTeaser } from "./_components/home/PluginsTeaser";
import { Premise } from "./_components/home/Premise";
import { Reasoning } from "./_components/home/Reasoning";
import { Stages } from "./_components/home/Stages";
import { Verdict } from "./_components/home/Verdict";
import { getLatestAnnouncement } from "./_lib/announcement";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const announcement = await getLatestAnnouncement();

  return (
    <>
      <Hero announcement={announcement} />
      <Premise />
      <Stages />
      <Reasoning />
      <Verdict />
      <Findings />
      <PluginsTeaser />
      <Faq />
      <GetStarted />
    </>
  );
}
