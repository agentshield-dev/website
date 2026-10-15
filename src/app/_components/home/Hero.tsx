import type { BlogAnnouncement } from "../../_lib/announcement";
import { siteConfig } from "../../site-config";
import { Arrow } from "../Arrow";
import { HeroGraph } from "../HeroGraph";
import { cx } from "../../_lib/cx";
import styles from "./Hero.module.css";

export function Hero({ announcement }: { announcement: BlogAnnouncement | null }) {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={cx("container", styles.hero__grid)}>
        <div className={styles.hero__copy}>
          {announcement ? (
            <a className={styles.hero__banner} href={announcement.href}>
              {announcement.title}
              <Arrow />
            </a>
          ) : null}
          <h1 className={styles.hero__title} id="hero-title">
            Assume every attacker is an agent.
          </h1>
          <p className={styles.hero__lede}>
            Agentshield is open source defense for Kubernetes and AWS. It learns how your
            workloads really talk, flags lateral movement with evidence, and proposes fixes you
            approve.
          </p>
          <div className={styles.hero__actions}>
            <a className="btn btn--primary" href="#start">
              Get started
              <Arrow direction="down" />
            </a>
            <a
              className="btn btn--quiet"
              href={siteConfig.links.repo}
              target="_blank"
              rel="noopener"
            >
              GitHub
              <Arrow direction="up-right" />
            </a>
          </div>
          <ul className={styles.hero__facts}>
            <li>Self-hosted</li>
            <li>Bring your own model</li>
            <li>Nothing applied without approval</li>
          </ul>
        </div>
        <div className={styles.hero__art}>
          <HeroGraph />
        </div>
      </div>
    </section>
  );
}
