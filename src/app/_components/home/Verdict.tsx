import { cx } from "../../_lib/cx";
import { siteConfig } from "../../site-config";
import { Arrow } from "../Arrow";
import styles from "./Verdict.module.css";

export function Verdict() {
  return (
    <section className="band" id="evals" aria-labelledby="verdict-title">
      <div className="container">
        <header className="head">
          <h2 id="verdict-title">Same request. Different verdict.</h2>
          <p className="lead">
            Lateral movement looks like normal traffic until you know what is allowed. So every
            attack in our evals has a benign twin that makes the identical request.
          </p>
        </header>

        <p className={styles.request}>
          <span className={styles.request__label}>Both workloads send</span>
          <code>GET /v1/secret/data/payment-signing-key</code>
        </p>

        <div className={styles.cases}>
          <article className={cx(styles.case, styles["case--threat"])}>
            <p className={styles.case__who}>
              From <strong>checkout-api</strong>, compromised
            </p>
            <p className={styles.case__story}>
              After a normal day of order traffic, it reaches for the payment signing key. No policy
              declares that path.
            </p>
            <p className={styles.case__verdict}>
              Finding <code className="token">possible_lateral_path</code>
            </p>
          </article>

          <article className={cx(styles.case, styles["case--ok"])}>
            <p className={styles.case__who}>
              From <strong>secret-rotation-controller</strong>, benign
            </p>
            <p className={styles.case__story}>
              It reads the same key on a schedule, through the path it was declared to use. Nothing
              about the traffic is new.
            </p>
            <p className={styles.case__verdict}>No finding</p>
          </article>
        </div>

        <div className={styles.verdict__foot}>
          <p>
            Six campaigns: three attacks and their three twins, across a compromised service, a
            build worker, and an identity provider. A campaign is scored only after the plugin’s own
            observation reaches the graph. The expected answer never reaches the model.
          </p>
          <a className="link" href={siteConfig.links.evals}>
            Read the eval catalog
            <Arrow />
          </a>
        </div>
      </div>
    </section>
  );
}
