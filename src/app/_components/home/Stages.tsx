import { Fragment } from "react";
import { cx } from "../../_lib/cx";
import styles from "./Stages.module.css";

const plugins = ["kubernetes", "istio", "cilium", "agentgateway", "falco", "aws"];

const assertion = [
  ["subject", "shop/orders"],
  ["predicate", "communicates-with"],
  ["object", "payments/ledger"],
  ["plugin", "istio"],
  ["source", "demo-cluster"],
  ["rule", "telemetry.communication-edge-lease"],
] as const;

const triggers = [
  ["Every graph change", "Detectors check whether it is new."],
  ["An active rule matches", "A finding, with no model call."],
  ["A new path or exposure", "The investigator takes over."],
  ["No signal", "Nothing reaches a model."],
] as const;

const fix = ["Plan", "Dry run", "Approve", "Apply", "Verify"];

export function Stages() {
  return (
    <section className="band" id="how" aria-labelledby="stages-title">
      <div className="container">
        <header className="head">
          <h2 id="stages-title">Signals in. Approved fix out.</h2>
          <p className="lead">
            Four stages around one graph. Each stage leaves a record, so a finding can always be
            traced back to what was seen.
          </p>
        </header>

        <ol className={styles.stages__list}>
          <li className={styles.stage}>
            <div className={styles.stage__body}>
              <span className={styles.stage__n} aria-hidden="true">
                1
              </span>
              <h3>Read your systems</h3>
              <p>
                Plugins are Go packages that each know one platform. They watch state, take in
                telemetry, and publish what they see. Kubernetes, Istio, Cilium, agentgateway, Falco,
                and AWS are in the box.
              </p>
            </div>
            <div className={styles.stage__spec}>
              <ul className={styles.chips} aria-label="Plugins in the box">
                {plugins.map((name) => (
                  <li key={name} className="token">
                    {name}
                  </li>
                ))}
              </ul>
              <p className={styles.spec__note}>
                Logs arrive over OTLP at <code className="token">POST /v1/logs</code>, or from
                Amazon Data Firehose for AWS
              </p>
            </div>
          </li>

          <li className={styles.stage}>
            <div className={styles.stage__body}>
              <span className={styles.stage__n} aria-hidden="true">
                2
              </span>
              <h3>Map them in one graph</h3>
              <p>
                Workloads, identities, policies, and exposures become nodes. Relationships become
                typed edges. Every assertion keeps the plugin, rule, and evidence that produced it.
              </p>
            </div>
            <div className={styles.stage__spec}>
              <dl className={styles.record}>
                {assertion.map(([key, value]) => (
                  <Fragment key={key}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </Fragment>
                ))}
              </dl>
              <p className={styles.spec__note}>An assertion from the demo environment</p>
            </div>
          </li>

          <li className={styles.stage}>
            <div className={styles.stage__body}>
              <span className={styles.stage__n} aria-hidden="true">
                3
              </span>
              <h3>Detect what changes</h3>
              <p>
                Detectors check every graph change against the last coherent state. A rule you
                activated, or one a model drafted and you approved, turns a match into a finding on
                its own. A new path or exposure goes to an investigator model, which walks the graph
                and answers with evidence, or with nothing.
              </p>
            </div>
            <div className={styles.stage__spec}>
              <dl className={styles.triggers}>
                {triggers.map(([when, what]) => (
                  <Fragment key={when}>
                    <dt>{when}</dt>
                    <dd>{what}</dd>
                  </Fragment>
                ))}
              </dl>
            </div>
          </li>

          <li className={styles.stage}>
            <div className={styles.stage__body}>
              <span className={styles.stage__n} aria-hidden="true">
                4
              </span>
              <h3>Fix what you approve</h3>
              <p>
                An investigated finding carries the outcomes that would close it. Plugins declare the
                actions they can take. You choose one, review the prepared change, and approve.
                Agentshield applies it and re-reads the result.
              </p>
            </div>
            <div className={styles.stage__spec}>
              <ol className={styles.steps}>
                {fix.map((step) => (
                  <li key={step} className={cx(step === "Approve" && styles.steps__you)}>
                    {step}
                  </li>
                ))}
              </ol>
              <p className={styles.spec__note}>Nothing is written before the approval step</p>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}
