import Link from "next/link";
import { cx } from "../_lib/cx";
import { siteConfig } from "../site-config";
import styles from "./Footer.module.css";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className={cx(styles.footer, "band--night", "on-night")}>
      <div className="container">
        <p className={styles.footer__line}>
          One attack path, pinned to evidence, closed by a fix you approve.
        </p>
        <div className={styles.footer__meta}>
          <Link className={styles.footer__brand} href="/" aria-label="agentshield, home">
            <Logo height={24} />
          </Link>
          <nav aria-label="Footer">
            <ul className={styles.footer__links}>
              <li>
                <Link href="/how-it-works/">How it works</Link>
              </li>
              <li>
                <Link href="/plugins/">Plugins</Link>
              </li>
              <li>
                <a href={siteConfig.links.docs}>Docs</a>
              </li>
              <li>
                <a href={siteConfig.links.blog}>Blog</a>
              </li>
              <li>
                <a href={siteConfig.links.repo}>GitHub</a>
              </li>
            </ul>
          </nav>
          <p className={styles.footer__note}>Open source.</p>
        </div>
      </div>
    </footer>
  );
}
