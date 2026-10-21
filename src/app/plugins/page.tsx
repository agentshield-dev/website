import { planned, plugins } from "../_data/plugins";
import { cx } from "../_lib/cx";
import { pageMetadata } from "../_lib/page-metadata";
import { siteConfig } from "../site-config";
import { Arrow } from "../_components/Arrow";
import { CodeBlock } from "../_components/CodeBlock";
import { GetStarted } from "../_components/GetStarted";
import { PageHead } from "../_components/PageHead";
import styles from "./page.module.css";

export const metadata = pageMetadata({
  title: "Plugins",
  description:
    "The plugins that ship with agentshield for Kubernetes and AWS, what is planned, and how to write one.",
  path: "/plugins/",
});

const detail: Record<string, { reads: string; telemetry?: string; scope?: string }> = {
  kubernetes: {
    reads:
      "Owns API discovery and one shared informer per resource type, covering workloads, services, RBAC, and admission configuration. Publishes one collection per type and reuses it for every plugin that asks.",
    scope:
      "Secrets arrive as metadata and a sorted list of key names. Values, type, and annotations are excluded.",
  },
  istio: {
    reads:
      "Models AuthorizationPolicy, PeerAuthentication, ambient enrollment, waypoints, ServiceEntry, and VirtualService on top of the Kubernetes plugin’s watches.",
    telemetry:
      "Maps waypoint OTLP access logs into bounded communication rollups. It needs a custom access-log provider that emits agentshield attributes, and only Deployment callers resolve.",
    scope:
      "ServiceEntry endpoint values stay out of the graph; only counts and address classes are kept.",
  },
  cilium: {
    reads:
      "Reads CiliumNetworkPolicy, CiliumClusterwideNetworkPolicy, CiliumEndpoint, and CiliumNode, and enriches the matching pods and nodes instead of creating rival identities.",
    telemetry: "A Hubble flow normalizer exists. Nothing feeds it yet.",
    scope: "CNI state and flows only. Service mesh, Envoy, and L7 policy are out of scope.",
  },
  agentgateway: {
    reads:
      "Projects GatewayClass, Gateway, HTTPRoute, and the Services they reference for agentgateway instances managed through Gateway API.",
    telemetry: "An access-log normalizer exists. Nothing feeds it yet.",
    scope: "Early. Expect it to change.",
  },
  falco: {
    reads:
      "Maps Falco alerts that an existing OpenTelemetry Collector forwards to the shared OTLP receiver. It opens no provider connection and owns no inventory.",
    telemetry:
      "Turns a terminal-shell alert into a process-exec event. The Pod gains an executes edge to the shell process class, and a rule can match on it.",
    scope:
      "Early. One use case: a Pod started an interactive shell. Command lines and user names are never copied.",
  },
  aws: {
    reads:
      "Inventories EC2 instances, network interfaces, and security groups in one region. It reconciles at startup and every five minutes, and CloudTrail events delivered through EventBridge and SQS trigger a reconcile right away.",
    telemetry: "Takes VPC Flow Logs straight from Amazon Data Firehose, with no collector in between.",
    scope:
      "Early. EC2 only: no routing, gateways, network ACLs, or IAM, and no fixes it can apply.",
  },
};

const rules = [
  [
    "Projectors are pure.",
    "Current objects in, graph input out, same result whatever the input order.",
  ],
  ["Identity is authority plus an immutable key.", "Names and addresses are attributes."],
  ["Every assertion names its source.", "Plugin, source, rule ID, and evidence IDs."],
  [
    "Replace, never patch.",
    "Publish the complete current output. What you omit is retracted.",
  ],
  [
    "Telemetry stays out of the graph.",
    "Only bounded rollups with resolved endpoints are projected.",
  ],
];

const sample = [
  "func New() (*Plugin, error) {",
  "  foos, err := kubernetes.NewResourceClient(kubernetes.ResourceRequirement{",
  '    GVR:        schema.GroupVersionResource{Group: "foo.example.io", Version: "v1", Resource: "foos"},',
  '    Capability: "foo-v1",',
  "  }, decodeFoo)",
  "  if err != nil {",
  "    return nil, err",
  "  }",
  "  return &Plugin{foos: foos}, nil",
  "}",
  "",
  "func (p *Plugin) KubernetesResources() []kubernetes.ResourceRequirement {",
  "  return []kubernetes.ResourceRequirement{p.foos.Requirement()}",
  "}",
  "",
  "func (p *Plugin) Descriptor() discovery.Descriptor {",
  "  return discovery.Descriptor{",
  '    ID:          "foo",',
  '    Version:     "1.0.0",',
  '    Description: "Foo security semantics",',
  "    Consumes:    []string{p.foos.Collection()},",
  '    Publishes:   []string{"foo/projection"},',
  "  }",
  "}",
];

export default function PluginsPage() {
  return (
    <>
      <PageHead
        title="Every system gets a plugin."
        lede="A plugin is a Go package for one system. It reads state, takes in telemetry, publishes into the graph, and can declare the fixes it knows how to apply."
      />

      <section className="band" aria-labelledby="shipped-title">
        <div className="container">
          <header className="head">
            <h2 id="shipped-title">In the box.</h2>
          </header>
          <ul className={styles.list}>
            {plugins.map((plugin) => {
              const info = detail[plugin.id];
              return (
                <li key={plugin.id} className={styles.plugin}>
                  <div className={styles.plugin__head}>
                    <h3>{plugin.name}</h3>
                    {plugin.status === "early" ? <span className={styles.tag}>Early</span> : null}
                  </div>
                  <div className={styles.plugin__body}>
                    <p>{info.reads}</p>
                    {info.telemetry ? <p>{info.telemetry}</p> : null}
                    {info.scope ? <p className={styles.plugin__scope}>{info.scope}</p> : null}
                  </div>
                  <div className={styles.plugin__caps}>
                    <ul className={styles.caps} aria-label={`${plugin.name} capabilities`}>
                      {plugin.capabilities.map((capability) => (
                        <li key={capability}>{capability}</li>
                      ))}
                    </ul>
                    {plugin.fix ? (
                      <p className={styles.plugin__fix}>
                        Can apply: <strong>{plugin.fix}</strong>
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="band band--tint" aria-labelledby="planned-title">
        <div className="container">
          <header className="head">
            <h2 id="planned-title">Planned, not shipped.</h2>
            <p className="lead">
              More runtime signals are next. Nothing here is in this release.
            </p>
          </header>
          <ul className={styles.planned__list}>
            {planned.map((item) => (
              <li key={item.name}>
                <h3>{item.name}</h3>
                <p>{item.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="band" id="write" aria-labelledby="write-title">
        <div className={cx("container", styles.write__grid)}>
          <div className={styles.write__copy}>
            <h2 id="write-title">Write one.</h2>
            <p className="lead">
              A plugin declares what it owns, consumes collections, and replaces its contribution as
              the world changes. The sample is from the plugin guide.
            </p>
            <ul className={styles.rules}>
              {rules.map(([title, text]) => (
                <li key={title}>
                  <strong>{title}</strong> {text}
                </li>
              ))}
            </ul>
            <div className={styles.write__actions}>
              <a className="btn btn--primary" href={siteConfig.links.pluginGuide}>
                Plugin guide
                <Arrow />
              </a>
              <a className="link" href={siteConfig.links.lifeOfAPlugin} target="_blank" rel="noopener">
                Life of a plugin
                <Arrow direction="up-right" />
              </a>
            </div>
          </div>
          <div className={styles.write__code}>
            <CodeBlock lines={sample} prompt={false} label="Copy the sample plugin" />
            <p className={styles.write__note}>
              Only one plugin may publish a collection name, and every consumed collection needs a
              publisher. The manager checks both before anything starts.
            </p>
          </div>
        </div>
      </section>

      <GetStarted />
    </>
  );
}
