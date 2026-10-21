---
title: Cilium
description: What the Cilium plugin reads, what it adds to the graph, the Hubble normalizer that has no transport yet, and the CiliumNetworkPolicy fix it can apply.
weight: 3
---

The Cilium plugin adds Cilium CNI policy and endpoint state to the graph and provides the CiliumNetworkPolicy remediation action. It does not model Cilium service mesh, Envoy configuration, or L7 policy. `CiliumEnvoyConfig` and `CiliumClusterwideEnvoyConfig` are not watched.

It reads Kubernetes collections, so the Kubernetes plugin watches the Cilium CRDs for it. CiliumEndpoint and CiliumNode observations enrich the existing Pod and Node nodes instead of creating separate identities.

| Detail | Value |
| --- | --- |
| Role | Semantic plugin and remediation provider |
| Authority | `--cilium-cluster-id` |
| Source ID | `--cilium-source-id` |
| Contribution | `cni-semantics` |

Set `--cilium-cluster-id` and `--cilium-source-id` to the Kubernetes plugin's values. See [Kubernetes](../kubernetes/).

## Kubernetes resources requested

| Capability | Resources | Required |
| --- | --- | --- |
| `cilium-core-v1` | pods, nodes | Yes |
| `cilium-policy-v2` | `cilium.io/v2` ciliumnetworkpolicies, ciliumclusterwidenetworkpolicies | No |
| `cilium-endpoint-v2` | `cilium.io/v2` ciliumendpoints | No |
| `cilium-node-v2` | `cilium.io/v2` ciliumnodes | No |

A Cilium API that is not served is `unsupported` and does not make the source unhealthy. One that is served but cannot be synced is `degraded`. A missing or ambiguous Pod or Node reference produces a diagnostic and no facet. It is not read as "no policy".

## What goes in the graph

| Output | Security semantics |
| --- | --- |
| `cilium-cni-policy` facet on each Cilium policy: scope and count of CNI-level rules | None, a summary |
| Pod `governed-by` Cilium policy | Governance for network access, declared, partial coverage |
| `cilium-cni` facet on a Pod: endpoint state, security identity, and enforcement mode | The observed `policy-enabled` value, partial coverage |
| `cilium-cni` facet on a Node: sorted Pod CIDRs and address count | None |

Rules with an L7 section are not counted and produce no Pod relationships. Their content is never copied into the graph. Neither the policy edge nor the endpoint facet claims effective enforcement.

## Hubble flows

The plugin can convert one Hubble flow into a `network-flow` telemetry event, keeping the original timestamp, the verdict as the outcome, the direction as the operation, and the protocol and ports as properties. Only TCP, UDP, SCTP, ICMP, and ICMPv6 are accepted. Labels, payloads, and HTTP fields are not kept.

No transport feeds it yet. The repository has no Hubble Relay client, no flag to enable one, and no stored cursor, so nothing in the `agentshield` binary calls the normalizer today.

## Remediation

`cilium-network-policy/v1` implements `network.declare-ingress-isolation` for a Pod. It labels the Pod with `agentshield.io/remediation-target` and creates an ingress-isolating CiliumNetworkPolicy. Before and after the label write it checks NetworkPolicies, CiliumNetworkPolicies, and CiliumClusterwideNetworkPolicies for overlap. See [Remediation](../../concepts/remediation/).
