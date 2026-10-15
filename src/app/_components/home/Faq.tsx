import { faqs } from "../../_data/faq";
import { cx } from "../../_lib/cx";
import { siteConfig } from "../../site-config";
import { Arrow } from "../Arrow";
import styles from "./Faq.module.css";

export function Faq() {
  return (
    <section className="band band--tint" id="faq" aria-labelledby="faq-title">
      <div className={cx("container", styles.faq__grid)}>
        <header className={styles.faq__head}>
          <h2 id="faq-title">Straight answers.</h2>
          <p className="lead">The rest is in the docs, or one issue away.</p>
          <div className={styles.faq__links}>
            <a className="link" href={siteConfig.links.docs}>
              Read the docs
              <Arrow />
            </a>
            <a className="link" href={siteConfig.links.issues} target="_blank" rel="noopener">
              Open an issue
              <Arrow direction="up-right" />
            </a>
          </div>
        </header>
        <div className={styles.faq__list}>
          {faqs.map((item) => (
            <details key={item.q} className={styles.qa}>
              <summary>{item.q}</summary>
              <div className={styles.qa__a} dangerouslySetInnerHTML={{ __html: item.a }} />
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
