import { cx } from "../../_lib/cx";
import styles from "./Reasoning.module.css";

const tools = [
  "get_security_neighborhood",
  "get_telemetry_chain",
  "get_governance_posture",
  "find_graph_paths",
  "get_incident_timeline",
  "get_behavior_baseline",
];

export function Reasoning() {
  return (
    <section className="band band--tint" id="reasoning" aria-labelledby="reasoning-title">
      <div className="container">
        <header className="head">
          <h2 id="reasoning-title">The model proposes. The graph decides.</h2>
          <p className="lead">
            A detector flags what is new, and only those changes reach a model. The model
            investigates, and every claim it makes is checked against what the graph returns.
          </p>
        </header>

        <div className={styles.lanes}>
          <article className={cx(styles.lane, styles["lane--investigator"], "on-night")}>
            <p className={styles.lane__when}>Runs on a change with a signal</p>
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
        </div>
      </div>
    </section>
  );
}
