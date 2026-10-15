import { cx } from "../../_lib/cx";
import styles from "./Premise.module.css";

export function Premise() {
  return (
    <section className={styles.premise} aria-labelledby="premise-title">
      <div className={cx(styles.premise__panel, "on-night")}>
        <div className={cx("container", styles.premise__grid)}>
          <h2 id="premise-title">
            A person tries a few doors. An agent tries{" "}
            <span className={styles.premise__hl}>all of them.</span>
          </h2>
          <div className={styles.premise__body}>
            <p>
              Defense in depth already assumes a breach. What changed is who is on the other side. An
              agent reads the whole environment, tries every route from the workload it holds, and
              does not get tired.
            </p>
            <p>
              Reviewing alerts one at a time cannot keep that pace. The reviewer has to be an agent
              too, and it has to show its evidence.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
