import { cx } from "../../_lib/cx";
import { siteConfig } from "../../site-config";
import { Arrow } from "../Arrow";
import styles from "./Reasoning.module.css";

const tools = [
  "get_security_neighborhood",
  "get_telemetry_chain",
  "get_governance_posture",
  "find_graph_paths",
  "get_incident_timeline",
  "get_behavior_baseline",
];

const authoring = ["Baseline window", "Shadow draft", "You approve", "Active rule"];

export function Reasoning() {
  return (
    <section className="band band--tint" id="reasoning" aria-labelledby="reasoning-title">
      <div className="container">
        <header className="head">
          <h2 id="reasoning-title">The model proposes. The graph decides.</h2>
          <p className="lead">
            A model can investigate a change or draft a rule, and neither is taken on trust. A
            finding is checked against what the graph returns. A drafted rule stays in shadow mode
            until you approve it.
          </p>
        </header>

        <div className={styles.lanes}>
          <article className={cx(styles.lane, styles["lane--investigator"], "on-night")}>
            <p className={styles.lane__when}>Runs on a new path or exposure</p>
            <h3>Investigator</h3>
            <p>
              An investigator model gets a compact packet and queries the graph through read-only
              tools. It can pull telemetry for a time slice when it needs the detail. It returns a
              finding with evidence, or nothing.
            </p>
            <ul className={styles.tools} aria-label="Investigator tools">
              {tools.map((tool) => (
                <li key={tool} className="token">
                  {tool}
                </li>
              ))}
            </ul>
            <ul className={styles.lane__points}>
              <li>Runs from its own sampled, budgeted queue, so a slow model never delays detection</li>
            </ul>
          </article>

          <article className={styles.lane}>
            <p className={styles.lane__when}>Runs on every answer</p>
            <h3>Validation</h3>
            <p>
              A finding is promoted only if it cites facts and evidence the graph actually returned.
              A wrong reference gets one correction turn.
            </p>
            <ul className={styles.lane__points}>
              <li>If a query hit its bound, nothing is promoted from it</li>
              <li>Model prose never overrides the check</li>
            </ul>
          </article>

          <article className={cx(styles.lane, styles["lane--author"])}>
            <div className={styles.author__copy}>
              <p className={styles.lane__when}>Runs once per Deployment revision</p>
              <h3>Rule author</h3>
              <p>
                After a baseline window, a model reads the requests a Deployment actually made and
                drafts up to three narrow rules. A draft runs in shadow mode until you approve it.
                An approved rule matches with no model call.
              </p>
            </div>
            <ol className={styles.steps} aria-label="Rule author steps">
              {authoring.map((step) => (
                <li key={step} className={cx(step === "You approve" && styles.steps__you)}>
                  {step}
                </li>
              ))}
            </ol>
          </article>
        </div>

        <a className={cx("link", styles.more)} href={siteConfig.links.rules}>
          How detection rules work
          <Arrow />
        </a>
      </div>
    </section>
  );
}
