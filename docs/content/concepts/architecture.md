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
5. **The change feed** (`graph_change_outbox`) records an ordered event for each publication that matters to detection.
6. **Detection** reads the change feed and runs the built-in checks, CEL rules, and approved Deployment rules. A match of an active rule becomes a finding. Eligible novelty signals go to a durable investigation queue.
7. **Investigation** drains that queue, samples it, asks a model to investigate through six read-only tools, validates the answer, and promotes or drops it.
8. **Findings** are stored, served by the API, and shown in the explorer. A finding from an investigation can carry remediation proposals you approve.

## Deterministic on both sides

| Layer | Deterministic | Contains |
| --- | --- | --- |
| Collect | Yes | Plugins, graph, change feed, detectors, rules |
| Investigate | No, a model | Investigation queue, packet, investigator with six read-only tools, Deployment rule author |
| Decide | Yes | Validation, promotion, findings |
| Act | You approve | Plan, dry run, approval, apply, verify |

A model can propose. It cannot change graph state, skip validation, activate a rule, or apply a fix.

## Where state lives

| State | Where |
| --- | --- |
| Graph: versions, assertions, projections, findings | PostgreSQL |
| Detection signals, investigation and rule-authoring queues, rulesets, rule drafts | PostgreSQL |
| Raw telemetry | Local JSONL (default) or ClickHouse |
| Prepared remediations and approvals | Memory of the running process |

Agentshield runs as one process per database, with no high availability. The collection hub, telemetry rollups, and prepared remediations live in that process's memory.

## Collections and contributions

A collection is delivery state: the stream of observations a plugin publishes for others to consume. A contribution is durable graph ownership: the complete output one plugin and source replaces on each publication. Names and lifecycles are separate. Only one plugin may publish a collection name, and every consumed collection needs a publisher. The manager checks both before anything starts.

## Several sources in one process

Kubernetes and AWS can run side by side. Every plugin instance has a stable source ID, and collection state, readiness, replay, and live delivery are scoped to it, so one instance cannot overwrite or consume another's observations. Plugins can still link what they each see: a Kubernetes Node that reports an EC2 `providerID` is `backed-by` the instance the AWS plugin inventoried.

## Restarts

Detection does not reconstruct history. If the durable cursor lags the current checkpoint after a start or restart, the service records a `startup_without_historical_snapshot` rebase and advances the cursor, so it analyzes the current state instead of what changed while it was down. A rebase invalidates active investigated findings grounded in an older graph digest. Rule findings are not invalidated automatically. See [Detection](../detection/).

For the full contracts, see the [architecture reference](/docs/architecture/).
