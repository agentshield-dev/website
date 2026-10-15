import { cx } from "../_lib/cx";
import { quickstart, reasoningStep, siteConfig } from "../site-config";
import { Arrow } from "./Arrow";
import { CodeBlock } from "./CodeBlock";
import styles from "./GetStarted.module.css";

export function GetStarted() {
  return (
    <section
      className={cx("band", "band--night", "on-night", styles.start)}
      id="start"
      aria-labelledby="start-title"
    >
      <div className={cx("container", styles.start__grid)}>
        <div className={styles.start__copy}>
          <h2 id="start-title">Run it yourself.</h2>
          <p className={styles.start__lede}>
            One binary with the explorer built in. It needs PostgreSQL and something to read: a
            Kubernetes context, AWS credentials, or both. Reasoning is optional.
          </p>
          <p className={styles.start__needs}>Needs Go, Node.js with pnpm, Docker, and kubectl.</p>
          <div className={styles.start__actions}>
            <a className="btn btn--primary" href={siteConfig.links.quickstart}>
              Quick start
              <Arrow />
            </a>
            <a
              className="btn btn--quiet"
              href={siteConfig.links.repo}
              target="_blank"
              rel="noopener"
            >
              View on GitHub
            </a>
          </div>
        </div>

        <div className={styles.start__code}>
          <CodeBlock lines={quickstart} />
          <p className={styles.start__after}>
            Open <code className="token">http://127.0.0.1:8088</code>. To turn on reasoning, set a
            model endpoint first.
          </p>
          <CodeBlock lines={[reasoningStep]} label="Copy the model endpoint command" />
        </div>
      </div>
    </section>
  );
}
