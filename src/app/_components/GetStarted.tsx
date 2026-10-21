import { cx } from "../_lib/cx";
import { modelSteps, quickstart, siteConfig } from "../site-config";
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
            Kubernetes context, AWS credentials, or both. The model is optional.
          </p>
          <p className={styles.start__needs}>Needs Go, Node.js with pnpm, Docker, and kubectl.</p>
          <p className={styles.start__needs}>
            No cluster? The demo runs the real UI against fake data in your browser.{" "}
            <a className="link" href={siteConfig.links.demo}>
              Try the demo
              <Arrow />
            </a>
          </p>
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
            Open <code className="token">http://127.0.0.1:8088</code>. For findings, point it at a
            model and turn on agentic investigation, then run <code className="token">make run</code>{" "}
            again.
          </p>
          <CodeBlock lines={modelSteps} label="Copy the model commands" />
        </div>
      </div>
    </section>
  );
}
