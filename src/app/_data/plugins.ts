export interface Plugin {
  id: string;
  name: string;
  status: "available" | "early";
  summary: string;
  capabilities: readonly ("Discovery" | "Telemetry" | "Remediation")[];
  fix?: string;
}

export const plugins: readonly Plugin[] = [
  {
    id: "kubernetes",
    name: "Kubernetes",
    status: "available",
    summary:
      "Workloads, services, RBAC, and admission config. One shared watch per resource type, reused by every plugin built on it.",
    capabilities: ["Discovery", "Remediation"],
    fix: "NetworkPolicy ingress isolation for a Pod or a Service",
  },
  {
    id: "istio",
    name: "Istio",
    status: "available",
    summary:
      "Mesh policy, ambient enrollment, and exposure. Turns waypoint OTLP access logs into bounded communication rollups.",
    capabilities: ["Discovery", "Telemetry", "Remediation"],
    fix: "STRICT mutual TLS with PeerAuthentication",
  },
  {
    id: "cilium",
    name: "Cilium",
    status: "available",
    summary:
      "CNI policy and endpoints. A Hubble flow normalizer exists, but no transport feeds it yet.",
    capabilities: ["Discovery", "Remediation"],
    fix: "CiliumNetworkPolicy ingress isolation",
  },
  {
    id: "agentgateway",
    name: "agentgateway",
    status: "early",
    summary:
      "Gateway API semantics for GatewayClass, Gateway, and HTTPRoute. Its access-log normalizer has no transport yet.",
    capabilities: ["Discovery"],
  },
  {
    id: "falco",
    name: "Falco",
    status: "early",
    summary:
      "Interactive-shell alerts from Falco, forwarded by your collector. A Pod that opens a shell gains an executes edge in the graph.",
    capabilities: ["Telemetry"],
  },
  {
    id: "aws",
    name: "AWS",
    status: "early",
    summary:
      "EC2 instances, network interfaces, and security groups in one region. Takes VPC Flow Logs straight from Amazon Data Firehose.",
    capabilities: ["Discovery", "Telemetry"],
  },
];

export const planned = [{ name: "Tetragon", note: "Runtime events from eBPF" }] as const;
