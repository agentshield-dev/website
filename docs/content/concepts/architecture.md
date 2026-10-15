---
title: Architecture
description: The pipeline from provider APIs to an approved fix, and where each stage keeps its records.
weight: 1
---

## The path

1. **Source plugins** read provider APIs. The Kubernetes plugin watches resources and publishes one shared collection per watched resource type, such as `kubernetes/resources/core/v1/pods`. The AWS plugin lists EC2 and publishes `aws/ec2/<region>/network-interfaces`, `instances`, and `security-groups`.
2. **Semantic plugins** (Istio, Cilium, agentgateway) consume those collections and project them into graph input with pure functions.
3. **The graph compiler** validates identities and content-addresses every assertion.
4. **Publication** replaces one plugin's complete contribution in a single transaction. It creates an immutable version and updates active assertion membership and the relational projections.
5. **The change outbox** (`graph_change_outbox`) records an ordered event for each publication that matters to reasoning.
6. **The reasoning service** reads the outbox, runs the novelty detector, asks a model to investigate what is new, validates the answer, and promotes or drops it.
7. **Findings** are stored, served by the API, and shown in the explorer. Each can carry remediation proposals you approve.

## Deterministic on both sides

| Layer | Deterministic | Contains |
| --- | --- | --- |
| Collect | Yes | Plugins, graph, change outbox, novelty detector |
| Investigate | No, a model | Investigator, which queries the graph through six read-only tools |
| Decide | Yes | Validation, promotion, findings |
| Act | You approve | Plan, dry run, approval, apply, verify |

A model can propose. It cannot change graph state, skip validation, or apply a fix.

## Where state lives

| State | Where |
| --- | --- |
| Graph: versions, assertions, projections, findings | PostgreSQL |
| Raw telemetry | Local JSONL (default) or ClickHouse |
| Prepared remediations and approvals | Memory of the running process |

## Collections and contributions

A collection is delivery state: the stream of observations a plugin publishes for others to consume. A contribution is durable graph ownership: the complete output one plugin and source replaces on each publication. Names and lifecycles are separate. Only one plugin may publish a collection name, and every consumed collection needs a publisher. The manager checks both before anything starts.

## Several sources in one process

Kubernetes and AWS can run side by side. Every plugin instance has a stable source ID, and collection state, readiness, replay, and live delivery are scoped to it, so one instance cannot overwrite or consume another's observations. Plugins can still link what they each see: a Kubernetes Node that reports an EC2 `providerID` is `backed-by` the instance the AWS plugin inventoried.

## Restarts

Reasoning does not reconstruct history. If the durable cursor lags the current checkpoint after a start or restart, the service records a `startup_without_historical_snapshot` rebase and advances the cursor, so it analyzes the current state instead of what changed while it was down. Findings grounded in the current graph digest stay valid. Findings grounded in an older digest are invalidated.

For the full contracts, see the `docs/` directory in the [repository](https://github.com/solo-io/agentshield/tree/main/docs).
