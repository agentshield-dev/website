---
title: Kubernetes
description: What the Kubernetes plugin watches, the RBAC it needs, what it puts in the graph, and the NetworkPolicy fixes it can apply.
weight: 1
---

The Kubernetes plugin is the only component that talks to the Kubernetes API. It watches cluster objects, publishes them as collections for the Istio, Cilium, and agentgateway plugins, and projects inventory and topology into the graph. It also provides the NetworkPolicy remediation actions.

| Detail | Value |
| --- | --- |
| Role | Source plugin and remediation provider |
| Authority | `--kubernetes-cluster-id` (default `local`) |
| Network realm | `--kubernetes-network-id` (defaults to the cluster ID) |
| Source ID | `--kubernetes-source-id` (default `kubernetes/local`) |
| Identity scheme | `kubernetes.io/v1, Kind=Object`, key `lowercase(apiVersion/kind/UID)` |
| Contribution | `inventory` |

Choose the cluster ID once per cluster and never change it. It is part of every Kubernetes identity in the graph, so changing it makes every resource look new. The Istio, Cilium, agentgateway, and Falco plugins have their own cluster ID flags. Set each to the same value so their assertions land on the same objects. The plugins that consume Kubernetes collections also need the same source ID as this one.

## Connecting

With `--kubernetes-kubeconfig`, the plugin uses that file. Without it, it uses the in-cluster configuration when `KUBERNETES_SERVICE_HOST` is set, and otherwise the standard loading rules: `KUBECONFIG`, then `~/.kube/config` and its current context. `--kubernetes-disable` leaves the Kubernetes plugins out, for an AWS-only run.

## What it watches

These resources are required. Startup fails if any is missing.

| Capability | Resources |
| --- | --- |
| `core` | namespaces, nodes, serviceaccounts, pods, services |
| `configuration` | configmaps, secrets |
| `storage` | persistentvolumeclaims |
| `workloads` | deployments, statefulsets, daemonsets, replicasets |
| `batch` | jobs, cronjobs |
| `ingress` | ingresses |
| `network-policy` | networkpolicies |
| `rbac` | roles, rolebindings, clusterroles, clusterrolebindings |
| `admission` | mutating and validating webhook configurations, validatingadmissionpolicies and their bindings |

`validatingadmissionpolicies` is `admissionregistration.k8s.io/v1`, so the cluster must run Kubernetes 1.30 or later. Gateway API `gateways` and `httproutes` are optional. The Istio, Cilium, and agentgateway plugins add their own requirements.

The plugin opens one shared informer per unique resource type, with a 30-minute resync. Secrets are published with metadata and a sorted list of key names only. Values, type, and annotations never enter collections or the database. The informer still reads Secrets, so the service account needs `list` and `watch` on them.

### RBAC

The process needs `get`, `list`, and `watch` on every resource above, plus those requested by the enabled plugins. Remediation actions need write access, listed [below](#remediation). The Helm chart installs a read-only ClusterRole. See [Deploy with Helm](../../operations/helm/).

## Coverage

At startup the plugin checks API discovery for every requested resource and publishes a coverage record for each resource type.

| Status | Meaning |
| --- | --- |
| `covered` | Watched and synced |
| `unsupported` | Optional and not served by the cluster |
| `degraded` | Advertised but could not be discovered or watched |
| `failed` | Required and unavailable, so startup fails |

`unsupported` and `degraded` never mean the objects do not exist. The semantic plugins wait for coverage before they publish.

## What goes in the graph

Every watched object with a UID becomes a resource of kind `kubernetes/<lowercase kind>`, except ReplicaSets, EndpointSlices, and Events. Attributes include the API version, name, namespace, labels, and a hash of the spec. Deployments also carry the service account name and a Pod template digest, which [Deployment rule authoring](../../concepts/rules/#when-a-draft-is-queued) uses to draft a rule per revision. Pods and Services get `network/addresses` and `network/role`, which is `control-plane-api` for `default/kubernetes`, `service` for other Services, and `workload` for Pods.

| Edge | Source |
| --- | --- |
| Namespace `contains` object | Namespace |
| Owner `instantiates` Pod | Owner references. ReplicaSets are skipped, so a Deployment points directly at its Pods. |
| Pod `uses-identity` ServiceAccount | Pod spec |
| Pod `runs-on` Node | Pod spec |
| Node `backed-by` cloud instance | The Node's `spec.providerID`, when the AWS plugin resolves it |
| Service `exposes` Pod | The Service selector, not EndpointSlices |
| Pod or Service `exposes` network destination | Current addresses |
| Ingress `exposes` Service | Ingress backend |
| Pod `governed-by` NetworkPolicy | Policy selector |
| HTTPRoute `member-of` Gateway, and `exposes` Service | Gateway API |

Facets carry [security semantics](../../concepts/graph/#security-semantics): `network-exposure` on Services, Ingresses, and Gateways, `transport-posture` on Gateways and HTTPRoutes, and `policy-targeting` on NetworkPolicies. NetworkPolicy rule lists are capped at 100 entries with the full count recorded.

## Remediation

| Action | Target | What it writes |
| --- | --- | --- |
| `network-policy/v1` | A Pod | Labels the Pod with `agentshield.io/remediation-target` and creates a NetworkPolicy that selects the label and denies ingress. Needs `update` on Pods and `create` on NetworkPolicies. |
| `service-network-policy/v1` | A Service | Creates a NetworkPolicy whose Pod selector is the Service's `spec.selector`, so ingress is denied to every Pod in the namespace with those labels, including Pods created later. Writes no labels. Needs `create` on NetworkPolicies. |

A Service without a selector is rejected, and so is any selected Pod that another ingress policy already covers. See [Remediation](../../concepts/remediation/).

## Scale

Every change re-projects the whole cache and rebuilds the current graph tables, so plan for inventory size times change rate. Not watching EndpointSlices keeps Pod churn from rewriting Service edges.
