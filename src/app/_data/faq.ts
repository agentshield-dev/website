export interface Faq {
  q: string;
  // Trusted HTML written in this file; rendered with dangerouslySetInnerHTML.
  a: string;
}

export const faqs: readonly Faq[] = [
  {
    q: "Is it only for Kubernetes?",
    a: "No. Plugins read Kubernetes, Istio, Cilium, agentgateway, and AWS EC2 networking today, and take in Falco runtime alerts. The graph and the plugin contract are provider-neutral, so other environments arrive as plugins. Fixes you can approve are applied through Kubernetes for now. The AWS plugin only observes.",
  },
  {
    q: "Do I need a model?",
    a: 'Only for findings. Discovery, the graph, telemetry, and the explorer run without one. Two features call a model, and both are off by default: agentic investigation, which needs an OpenAI Responses-compatible endpoint, and Deployment rule authoring, which also works with Anthropic. Setting <code class="token">AGENTSHIELD_MODEL_ENDPOINT</code> alone enables neither.',
  },
  {
    q: "What does the model see?",
    a: "An investigation starts from a compact packet with no telemetry in it: resource IDs, kinds, typed security semantics, and opaque evidence handles. Anything deeper comes through six read-only tools pinned to that graph snapshot, and every result is bounded. Rule authoring sees a Deployment’s name, namespace, service account, and a summary of its outbound requests, with query strings removed and identifier-like path segments masked.",
  },
  {
    q: "Does the model write detection rules?",
    a: "It drafts them. For each Deployment, a model proposes up to three narrow rules from the requests the Deployment made during a baseline window. A draft runs in shadow mode, recorded but never a finding, until you approve it. You can also write rules in CEL yourself. A match of an active rule becomes a finding with no model call.",
  },
  {
    q: "Will it change my cluster on its own?",
    a: "No. Detection, rules, investigation, and planning never apply anything. A change needs your explicit approval of a prepared plan, and the approval endpoints only run on a loopback listener.",
  },
  {
    q: "How mature is it?",
    a: "It is early and pre-1.0, so expect breaking changes to APIs, the database schema, and flags. The HTTP API and UI have no authentication, approval state lives in process memory, it runs as one process per database, and verification confirms that the declared policy is present, not that traffic is blocked. Evaluate it; do not expose it.",
  },
];
