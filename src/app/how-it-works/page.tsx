import { Fragment } from "react";
import { cx } from "../_lib/cx";
import { pageMetadata } from "../_lib/page-metadata";
import { siteConfig } from "../site-config";
import { GetStarted } from "../_components/GetStarted";
import { PageHead } from "../_components/PageHead";
import styles from "./page.module.css";

export const metadata = pageMetadata({
  title: "How it works",
  description:
    "The agentshield pipeline end to end: plugins, the graph, the change feed, detection rules, evidence-validated reasoning, and approved remediations.",
  path: "/how-it-works/",
});

type Zone = {
  who: string;
  title: string;
  kind?: "model" | "you";
  steps: readonly (readonly [string, string])[];
};

const zones: readonly Zone[] = [
  {
    who: "Deterministic",
    title: "Collect",
    steps: [
      ["Plugins", "read systems and take in telemetry"],
      ["Graph", "versioned in PostgreSQL, with evidence IDs"],
      ["Change feed", "an ordered, transactional outbox"],
      ["Detectors", "built-in checks and rules ask whether a change is new"],
    ],
  },
  {
    who: "Model",
    title: "Investigate",
    kind: "model",
    steps: [
      ["Queue", "eligible signals wait in a durable queue, sampled and budgeted"],
      ["Packet", "a compact summary of the change, with no telemetry in it"],
      ["Investigator", "queries the graph through six read-only tools"],
    ],
  },
  {
    who: "Deterministic",
    title: "Decide",
    steps: [
      ["Validation", "every claim must cite what the graph returned"],
      ["Promotion", "a finding is kept or dropped"],
      ["Rule match", "an active rule’s match is a finding with no model call"],
      ["Findings", "persisted, served by API, shown in the explorer"],
    ],
  },
  {
    who: "You approve",
    title: "Act",
    kind: "you",
    steps: [
      ["Plan", "the plugin resolves current state"],
      ["Dry run", "every write is checked first"],
      ["Approval", "a person submits the prepared plan"],
      ["Apply and verify", "the plugin writes, then re-reads"],
    ],
  },
];

const predicates = [
  "contains",
  "instantiates",
  "member-of",
  "uses-identity",
  "exposes",
  "governed-by",
  "communicates-with",
  "runs-on",
  "backed-by",
  "executes",
];

const identity = [
  ["scheme", "kubernetes.io/v1, Kind=Object"],
  ["authority", "stable cluster ID"],
  ["key", "lowercase(apiVersion/kind/UID)"],
] as const;

const reasoning = [
  {
    title: "A change lands",
    text: "Each publication that matters to reasoning writes one ordered event to the outbox, in the same transaction. Telemetry-only updates do not.",
  },
  {
    title: "Detectors ask whether it is new",
    text: "Built-in checks compare the previous graph with a coherent checkpoint. A new communication path from a workload that already had traffic, a resource becoming externally addressable, typed semantics changing or disappearing, a governed-by edge being retracted, a new RBAC binding or admission webhook, and a workload taking on a new identity all raise a signal. Rules you activated run in the same window. Windows with no signal never reach a model.",
  },
  {
    title: "Each signal is routed",
    text: "A match of an active rule becomes a finding with no model call. A match of an unreviewed draft is only recorded. A built-in signal of medium risk or higher is queued for investigation, where batching, sampling, deduplication, and an hourly budget bound model spend.",
  },
  {
    title: "The model gets a small packet",
    text: "Resource IDs, kinds, typed security semantics, opaque evidence handles, and the signals. No telemetry and no provider-native configuration.",
  },
  {
    title: "It investigates with read-only tools",
    text: "Neighborhoods, paths, governance posture, telemetry chains, timelines, and baselines. Each result is bounded and pinned to the packet’s analysis token.",
  },
  {
    title: "The harness validates",
    text: "A candidate needs a selected signal, entities from the packet, returned fact IDs, and evidence IDs attached to those facts. A wrong reference gets one correction turn. Truncated retrieval blocks promotion.",
  },
  {
    title: "A finding is promoted or dropped",
    text: "Finding IDs are deterministic. A later change that touches an affected entity invalidates an investigated finding; it stays available for audit but cannot launch a remediation.",
  },
];

const providers = [
  [
    "Kubernetes (Pod)",
    "network-policy/v1",
    "network.declare-ingress-isolation",
    "A pod label and an ingress-isolating NetworkPolicy",
  ],
  [
    "Kubernetes (Service)",
    "service-network-policy/v1",
    "network.declare-ingress-isolation",
    "An ingress-isolating NetworkPolicy for the Pods the Service selects",
  ],
  [
    "Cilium",
    "cilium-network-policy/v1",
    "network.declare-ingress-isolation",
    "A pod label and an ingress-isolating CiliumNetworkPolicy",
  ],
  [
    "Istio",
    "peer-authentication/v1",
    "transport.require-mutual-tls",
    "A pod label and a STRICT PeerAuthentication",
  ],
] as const;

const limits = [
  "Kubernetes and AWS EC2 networking only. The graph and plugin contract are provider-neutral; other environments will arrive as plugins.",
  "The AWS plugin is early and read-only. It models instances, network interfaces, and security groups, not routing, gateways, network ACLs, or IAM, so a public address or an open rule is not treated as proof of exposure.",
  "The graph models network and policy. Permissions, reachability from network policy, and secret access are not edges yet.",
  "Detection works on batches of graph changes, so it is near real time, not instant. A telemetry rule that watches for a new operation or outcome on a pair that already communicates waits for the next unrelated graph change.",
  "On first start, or after a restart that lags, it rebases to the current state instead of analyzing what changed while it was down.",
  "The HTTP API and UI have no authentication. Approval state lives in memory, mutations are served only on a loopback listener, and one process runs per database.",
  "The Hubble flow and agentgateway access-log normalizers exist, but no transport feeds them yet.",
  "Verification confirms the declared policy and label are present. It does not prove the controller accepted them or that traffic is blocked.",
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHead
        title="The pipeline, end to end."
        lede="What each stage does, what it stores, and the one place a model is allowed in."
      />

      <section className="band" aria-labelledby="zones-title">
        <div className="container">
          <header className="head">
            <h2 id="zones-title">A model between two deterministic layers.</h2>
            <p className="lead">
              Everything before the model is deterministic. Everything after it is too. A person
              decides what gets applied.
            </p>
          </header>
          <ol className={styles.zones}>
            {zones.map((zone, index) => (
              <li
                key={zone.title}
                className={cx(styles.zone, zone.kind && styles[`zone--${zone.kind}`])}
              >
                <span className={styles.zone__n} aria-hidden="true">
                  {index + 1}
                </span>
                <h3>{zone.title}</h3>
                <p className={styles.zone__who}>{zone.who}</p>
                <ul className={styles.zone__steps}>
                  {zone.steps.map(([name, text]) => (
                    <li key={name}>
                      <strong>{name}</strong> {text}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="band band--tint" aria-labelledby="graph-title">
        <div className={cx("container", styles.split)}>
          <div className={styles.split__copy}>
            <h2 id="graph-title">The graph is the shared language.</h2>
            <p className="lead">
              Every plugin describes its world as resources, facets, and relationships. Detectors
              and the first packet use neutral security semantics, not provider-native fields, so
              adding a plugin does not mean teaching the model a new format.
            </p>
            <ul className={styles.facts}>
              <li>
                <strong>Identity does not drift.</strong> Names, labels, and IP addresses are
                attributes. Identity is an authority plus an immutable key.
              </li>
              <li>
                <strong>Plugins replace, not patch.</strong> Each publishes its complete current
                output. Whatever it omits is retracted.
              </li>
              <li>
                <strong>Every publication is a version.</strong> The canonical graph is compiled
                from active assertions and carries a SHA-256 digest that findings are pinned to.
              </li>
              <li>
                <strong>Security facts are typed.</strong> Class, domain, state, effect, scope,
                direction, and coverage are explicit. A declared policy is not assumed to be
                enforced.
              </li>
            </ul>
          </div>
          <div className={styles.split__panel}>
            <h3>Identity</h3>
            <dl className={styles.record}>
              {identity.map(([key, value]) => (
                <Fragment key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </Fragment>
              ))}
            </dl>
            <p className={styles.panel__note}>
              Shown for Kubernetes. AWS resources use{" "}
              <code className="token">aws.amazon.com/v1, Kind=Resource</code> with the owning
              account as the authority.
            </p>
            <h3>Relationships</h3>
            <ul className={styles.chips} aria-label="Relationship vocabulary">
              {predicates.map((name) => (
                <li key={name} className="token">
                  {name}
                </li>
              ))}
            </ul>
            <p className={styles.panel__note}>
              A closed vocabulary. A new predicate is added centrally, not per plugin.
            </p>
          </div>
        </div>
      </section>

      <section className="band" aria-labelledby="telemetry-title">
        <div className="container">
          <header className="head">
            <h2 id="telemetry-title">Telemetry stays out of the graph.</h2>
            <p className="lead">
              The graph says what exists and what is allowed. Telemetry says what is happening. They
              meet at one identity.
            </p>
          </header>
          <div className={styles.trio}>
            <div>
              <h3>In</h3>
              <p>
                Istio access logs and Falco alerts arrive over OTLP/HTTP from your collector, and
                AWS VPC Flow Logs arrive straight from Amazon Data Firehose. Plugins map them into
                normalized events. Ownership comes from registration, never from the payload.
              </p>
            </div>
            <div>
              <h3>Stored</h3>
              <p>
                Raw events go to local JSONL or ClickHouse before anything is projected, with
                explicit backpressure. Nothing uncommitted reaches the graph.
              </p>
            </div>
            <div>
              <h3>Rolled up</h3>
              <p>
                The graph holds bounded rollups and evidence IDs, not payloads. A{" "}
                <code className="token">communicates-with</code> edge, or an{" "}
                <code className="token">executes</code> edge for a shell alert, is a lease: it
                refreshes while observations continue and retracts when they stop.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="band band--tint" aria-labelledby="reasoning-title">
        <div className="container">
          <header className="head">
            <h2 id="reasoning-title">How a change becomes a finding.</h2>
            <p className="lead">
              The model is an advisory investigator. The service stays authoritative for graph
              state, retrieval bounds, evidence, and promotion.
            </p>
          </header>
          <ol className={styles.timeline}>
            {reasoning.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="band" aria-labelledby="remediation-title">
        <div className="container">
          <header className="head">
            <h2 id="remediation-title">Fixes come from the plugins that can apply them.</h2>
            <p className="lead">
              An investigation attaches desired outcomes to a finding. It never picks a provider.
              You see every action that is live and choose one.
            </p>
          </header>
          <ul className={styles.providers}>
            {providers.map(([name, action, outcome, result]) => (
              <li key={name} className={styles.provider}>
                <h3>{name}</h3>
                <dl>
                  <dt>Action</dt>
                  <dd>
                    <code className="token">{action}</code>
                  </dd>
                  <dt>Outcome</dt>
                  <dd>
                    <code className="token">{outcome}</code>
                  </dd>
                  <dt>Result</dt>
                  <dd>{result}</dd>
                </dl>
              </li>
            ))}
          </ul>
          <p className={styles.advisory}>
            A third outcome, <code className="token">gateway.prevent-route-delivery</code>, can be
            suggested, but no shipped plugin implements it yet. The AWS plugin has no actions
            either, and a finding from a rule match carries no outcomes, so it has nothing to apply.
          </p>
          <p className={styles.advisory}>
            Preparation runs a dry run for every intended write. Execution re-reads the target,
            writes, and attempts to roll back a new pod label if the policy write fails.{" "}
            <a href={siteConfig.links.remediation}>Read the remediation docs</a>.
          </p>
        </div>
      </section>

      <section className="band band--tint" aria-labelledby="limits-title">
        <div className="container">
          <header className="head">
            <h2 id="limits-title">Where it stops today.</h2>
            <p className="lead">It is v0. These are the edges, stated plainly.</p>
          </header>
          <ul className={styles.limits__list}>
            {limits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <GetStarted />
    </>
  );
}
