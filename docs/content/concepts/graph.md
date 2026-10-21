---
title: Graph
description: Resources, relationships, and facets with stable identities, versioned in PostgreSQL.
weight: 2
---

## What the graph holds

Every plugin describes its world as resources, facets, and relationships.

- A **resource** is a node, such as a workload, a service, a policy, or a network interface.
- A **relationship** is a typed edge between resources.
- A **facet** is a typed statement attached to a resource or a relationship.

The detectors and the investigator read neutral security semantics, not provider-native fields, so adding a plugin does not mean teaching the model a new format.

## Identity

Identity does not drift. Names, labels, and IP addresses are attributes. Identity is an authority plus an immutable key, under a scheme.

| Part | Kubernetes resources | AWS resources |
| --- | --- | --- |
| Scheme | `kubernetes.io/v1, Kind=Object` | `aws.amazon.com/v1, Kind=Resource` |
| Authority | The stable cluster ID (`--cluster-id`) | The 12-digit ID of the account that owns the resource |
| Key | `lowercase(apiVersion/kind/UID)` | `<partition>/ec2/<region>/<kind>/<id>`, where kind is `instance`, `network-interface`, or `security-group` |

Network destinations use a provider-neutral scheme, `agentshield.io/v1, Kind=NetworkDestination`. The authority is the network realm. It defaults to the cluster ID for Kubernetes, and AWS flow-log peers are scoped by partition, account, region, and VPC. The key is `dns/<host>` or `ip/<address>`. Istio, Cilium, AWS, and telemetry all reuse it.

Two more provider-neutral schemes keep telemetry bounded. A network peer class, `agentshield.io/v1, Kind=NetworkPeerClass`, stands in for addresses that match no known resource, such as `external-destination` or `private-ip`, so unknown traffic does not create a node per IP address. A process class, `agentshield.io/v1, Kind=ProcessClass`, names a category of process, currently `shell`, and is the object of the `executes` relationship that the Falco plugin produces.

The compiler derives a deterministic UUID from each identity, so references to the same resource converge on one node even when they come from different collections or contributions.

## Relationships

The predicate vocabulary is closed. A new predicate is added centrally, not per plugin.

`contains`, `instantiates`, `member-of`, `uses-identity`, `exposes`, `governed-by`, `communicates-with`, `runs-on`, `backed-by`, `executes`

For example, an HTTPRoute is `member-of` a Gateway and `exposes` a Service, a Gateway is `governed-by` its GatewayClass, a Pod `runs-on` a Node, an EC2 network interface is `governed-by` a security group, observed traffic becomes a `communicates-with` edge, and a shell that Falco saw in a Pod becomes an `executes` edge to the `shell` process class.

A Node is `backed-by` the instance that hosts it. When the other end has not been materialized, a relationship stays `unresolved` until it appears, so that link waits until the AWS plugin has inventoried the instance.

## Assertions

Each assertion states one fact and records where it came from.

| Field | Meaning |
| --- | --- |
| `pluginId` | The plugin that owns the semantics |
| `sourceId` | The stable upstream instance |
| `ruleId` | The deterministic projection logic. A new ID whenever the semantics change. |
| `evidenceIds` | Durable pointers to the observations behind the fact |

Assertions are content-addressed and deduplicated across contributions.

## Versions and the digest

A plugin does not patch the graph. `ReplaceContribution` replaces the complete output of one plugin and source in one transaction, and whatever it omits is retracted. Each publication is an immutable version. Retrying the same generation with the same input is idempotent, and a different input for the same generation is rejected.

The canonical graph is compiled from the active assertions and carries a SHA-256 digest. Findings are pinned to the digest they were raised on.

## Security semantics

A security-relevant fact carries a typed `v1` envelope on its facet or relationship. The envelope inherits the provenance and lifecycle of the thing it is attached to, and the compiler rejects unknown fields.

| Field | Allowed values |
| --- | --- |
| `class` | `exposure`, `governance` |
| `domain` | `network-access`, `authorization`, `transport-authentication` |
| `state` | `declared`, `observed`, `unknown` |
| `effect` | `unknown`, or a value that fits the class and domain: `internal` or `external-addressable` for network exposure, `restrict`, `allow`, or `deny` for network-access governance, `allow`, `deny`, `audit`, or `custom` for authorization, `require`, `permit`, `disable`, or `inherit` for transport authentication |
| `scope` | `workload`, `namespace`, `mesh`, `service`, `gateway`, `cluster`, `external`, `unknown` |
| `direction` | `ingress`, `egress`, `bidirectional`, `not-applicable`, `unknown` |
| `coverage` | `complete`, `partial`, `unknown` |

The envelope can also list up to 16 `protocols`, up to 64 unique protocol and port pairs, and a `configurationDigest` of at most 128 characters.

A declared policy is not assumed to be enforced. `state` says whether a fact is declared, observed, or unknown, and `coverage` says how much of the native fact the envelope could hold. Coverage is not confidence, and it never upgrades `state`. Public exposure is never inferred from an Ingress, a Gateway, a ServiceEntry, a public address, or an open security-group rule alone.

Runtime evidence, such as `process-exec` telemetry and the `executes` relationship, is provider-native and carries no envelope. An observation does not establish an exposure or governance fact. Detection rules and reasoning interpret it.

For the full model, see `docs/concepts/data-model.md` and `docs/concepts/security-semantics.md` in the [repository](https://github.com/agentshield-dev/agentshield/tree/main/docs/concepts).
