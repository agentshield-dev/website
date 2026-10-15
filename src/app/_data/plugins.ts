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
      "Workloads, services, and policy. One shared watch per resource type, reused by every plugin built on it.",
    capabilities: ["Discovery", "Remediation"],
    fix: "NetworkPolicy ingress isolation",
  },
  {
    id: "istio",
    name: "Istio",
    status: "available",
    summary:
      "Mesh policy and exposure. Turns waypoint OTLP access logs into bounded communication rollups.",
    capabilities: ["Discovery", "Telemetry", "Remediation"],
    fix: "STRICT mutual TLS with PeerAuthentication",
  },
  {
    id: "cilium",
    name: "Cilium",
    status: "available",
    summary:
      "CNI policy and endpoints. Normalizes Hubble network flows into the same telemetry shape.",
    capabilities: ["Discovery", "Telemetry", "Remediation"],
    fix: "CiliumNetworkPolicy ingress isolation",
  },
  {
    id: "agentgateway",
    name: "agentgateway",
    status: "early",
    summary:
      "Gateway API semantics for GatewayClass, Gateway, and HTTPRoute, plus access logs.",
    capabilities: ["Discovery", "Telemetry"],
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

export const planned = [
  { name: "Tetragon", note: "Runtime events from eBPF" },
  { name: "Falco", note: "Runtime detections" },
] as const;
