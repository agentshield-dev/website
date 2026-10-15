export interface Faq {
  q: string;
  // Trusted HTML written in this file; rendered with dangerouslySetInnerHTML.
  a: string;
}

export const faqs: readonly Faq[] = [
  {
    q: "Is it only for Kubernetes?",
    a: "No. Plugins read Kubernetes, Istio, Cilium, agentgateway, and AWS EC2 networking today. The graph and the plugin contract are provider-neutral, so other environments arrive as plugins. Fixes you can approve are applied through Kubernetes for now. The AWS plugin only observes.",
  },
  {
    q: "Do I need a model?",
    a: 'No. Discovery, the graph, and the explorer run without one. Reasoning turns on when you point <code class="token">AGENTSHIELD_MODEL_ENDPOINT</code> at an OpenAI-compatible endpoint that supports the Responses API.',
  },
  {
    q: "What does the model see?",
    a: "The first request is a compact packet with no telemetry in it: resource IDs, kinds, typed security semantics, and opaque evidence handles. Anything deeper comes through six read-only tools pinned to that graph snapshot, and every result is bounded.",
  },
  {
    q: "Will it change my cluster on its own?",
    a: "No. Reasoning, findings, and planning never apply anything. A change needs your explicit approval of a prepared plan, and in this release the approval endpoints only run on a loopback listener.",
  },
  {
    q: "How mature is it?",
    a: "It is v0. The development API has no production authentication, approval state lives in process memory, and verification confirms that the declared policy is present, not that traffic is blocked. Evaluate it; do not expose it.",
  },
];
