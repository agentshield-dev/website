---
title: 'Design brief: scale and architecture'
description: >-
  Open design proposal for scaling graph publication, discovery, telemetry, and
  reads to 100,000 workloads.
weight: 120
---
Status: open for design. Source: Yuval Kohavi's code review of 2026-10-20 ([AgentShield code review: architecture and code quality](https://claude.ai/artifact/Qja5mBw3kcdVDRSgssXy7Z)), taken at commit `3757677`, whose tree matches `main` at `34c12ffd`. Line numbers below refer to that tree.

This page collects the review's scale and architecture findings as input for a redesign. The resilience, correctness and readability findings are being fixed separately as contained edits and are not repeated here, except where a design choice below would subsume one (noted inline).

## Goal

Reach 100,000 workloads. At that size, expect roughly:

- 100,000 Deployments, which is 400,000 to 500,000 resources
- 600,000 facets
- 1 million relationships
- up to 100,000 telemetry series

The review expects the current code to stall somewhere under 10,000 workloads.

## The core problem

The whole graph is the unit of work. Almost every publication and almost every read costs O(whole graph). Writes go one row per round trip under a single global lock, and telemetry drives that path every 250 ms.

The data model is sound and must stay: content-addressed assertions, replacement semantics, an outbox. What does not scale is how the graph is materialized and read.

Today's flow:

1. Every writer (discovery plugins, the telemetry rollup publisher) calls `ReplaceContribution`.
2. That takes one global advisory lock, writes assertions row by row, recompiles the whole graph, and deletes and re-inserts every `current_*` projection table.
3. Every reader (API handlers, `/readyz`, SSE streams, the reasoning checkpoint, the post-commit hook in `ReplaceContribution`) calls `Store.Latest`, which compiles the whole graph again from the assertion tables.
4. The `current_*` projection tables, built for readers, are almost write-only.

## Constraints the design must keep

These come from [AGENTS.md](https://github.com/solo-io/agentshield/blob/main/AGENTS.md) and the docs it links to. A design that breaks one needs to say so and why.

- Identity keys are authority-qualified and immutable.
- Every assertion carries plugin ID, source ID, rule ID and evidence IDs.
- Projectors are pure and deterministic; shuffled input gives the same graph digest.
- A contribution is the whole current output of `(plugin, source, contribution name)`; omission retracts.
- Generations only go up, across restarts; a same-generation retry with the same content is a no-op.
- Publication is atomic and the current graph stays coherent.
- Plugins reference each other by stable identity and never depend on another plugin's publication order.
- Only per-minute telemetry rollups with authority-qualified endpoints enter the graph; raw events stay in the telemetry pipeline and raw sink.
- Schema changes are new embedded migrations; applied migrations are never edited.

Owning docs: [data model](/docs/concepts/data-model/), [publication and storage](/docs/architecture/publication-and-storage/), [telemetry](/docs/architecture/telemetry/), [change feed and reasoning](/docs/architecture/change-feed-and-reasoning/), [plugin contract](/docs/plugins/contract/).

## Findings: publication and storage

| Sev | Where | Problem | Reviewer's suggested fix |
| --- | --- | --- | --- |
| High | `pkg/state/versioned.go:738-785` | Every publication DELETEs all of `current_resources`, `current_facets`, `current_relationships`, `unresolved_relationships` and `assertion_conflicts`, then re-inserts them one `tx.Exec` per row, inside the publication transaction. | Maintain the projection incrementally from the step-5 delta. Use `COPY` or `unnest` batches for what must be written. |
| High | `pkg/state/versioned.go:109, 165-225` | `pg_advisory_xact_lock(graphPublicationLockKey)` serializes all publishers. Inside it, each assertion costs 3 to 5 round trips (insert, identity insert, verify select), and membership is deleted and re-inserted whole. About 8 million round trips for the first Kubernetes publish at target size. | Bulk-load with set-based identity checks. Compute the membership diff in SQL (`EXCEPT`). Shrink the critical section. |
| High | `pkg/state/versioned.go:797`, `pkg/api/catalog.go:83-223`, `pkg/api/server.go:199-224` | `Store.Latest` loads every active assertion, compiles, canonicalizes and hashes the graph on every call, with no cache. It runs for every catalog, detail, neighborhood and overview request, for `/readyz`, for each SSE stream on revision change, for the reasoning checkpoint, and after every `ReplaceContribution` (`pkg/state/store.go:339`). | Cache one compiled view per `GraphRevision` behind `singleflight`. Serve list, detail and search as indexed SQL over the `current_*` tables with keyset pagination. Drop the post-commit `Latest`. |
| High | `pkg/state/versioned.go:227-294` | The outbox event and the membership checkpoint are each one JSONB row that grows with the contribution. A first publish with over a million assertions passes PostgreSQL's ~255 MB jsonb limit and fails on every retry. | Chunk checkpoints and outbox payloads, or have the event reference its `contribution_version_changes` rows and page through them. |
| Medium | `pkg/state/versioned.go:465-477` | Immutable telemetry assertions, contribution versions, change rows and `graph_manifests` rows grow without bound. A changed count is a new content address. At 50,000 active series that is tens of millions of rows a day. | Keep no version history for rollup contributions. Garbage-collect unreferenced assertions. Prune the outbox behind the slowest cursor. |
| Medium | `pkg/state/deployment_authoring.go:192-270` | `enqueueNewDeploymentRuleJobs` scans every Deployment inside the publication lock on every publish, including telemetry-only ones. | Run it only when the delta adds or retracts Deployments, and batch the inserts. |

## Findings: telemetry into the graph

| Sev | Where | Problem | Reviewer's suggested fix |
| --- | --- | --- | --- |
| High | `pkg/telemetry/publisher.go:80-123`, `pkg/telemetry/pipeline.go:67` | Each 250 ms flush calls `Store.Latest` (a full compile), then republishes every owner ever seen. Each republish runs the full publication path, followed by another `Latest`. | Decouple sink batches from projection. Republish only dirty owners on a 15 to 60 s cadence. Resolve endpoints against an index cached by `GraphRevision`. |
| Medium | `pkg/telemetry/rollup.go:172-200`, `cmd/agentshield/main.go:356` | Series are keyed per minute, so `MaxSeries=100000` holds only about 69 always-on pairs for 24 h. Once full, `evictOldest` scans the whole map for every new series, so retention shrinks to minutes and leases flap. | Keep leases in their own map. Keep only recent windows in the graph and send history to ClickHouse. Evict with a heap. |
| Medium | `pkg/telemetry/publisher.go:96-123`, `pkg/state/versioned.go:273-294` | Every telemetry owner is republished with a new generation each batch, even when its input is unchanged. An unchanged generation still advances `graph_change_sequence` and writes an empty outbox event, and detection then does a full checkpoint read per window. The docs say telemetry creates no change-feed events. | Skip owners whose resolved input digest is unchanged, and write no outbox row for an empty delta. |

The last row is listed under Correctness in the review. It is here because the fix depends on how telemetry publishes, which this design decides.

## Findings: discovery

| Sev | Where | Problem | Reviewer's suggested fix |
| --- | --- | --- | --- |
| High | `plugins/kubernetes/plugin.go:255-278` | On each reconcile, the Kubernetes plugin deep-copies every informer object and republishes the whole cluster as one `inventory` contribution. | Split into per-namespace or per-kind contributions, or project incrementally from informer deltas. |
| High | `plugins/kubernetes/plugin.go:236-251`, `plugins/istio/plugin.go:182-195` | Any informer event makes the Kubernetes plugin re-project the whole cluster. It then re-marks every collection ready, so istio, cilium and agentgateway each re-project too, even for a ConfigMap they do not consume. One Pod update becomes four O(graph) publishes, and Pod churn at target size never stops. | Rate-limit reconciles. Mark only changed collections ready, and skip projection when no consumed collection changed. Skip `ReplaceContribution` when the input digest and health are unchanged. |
| Medium | `plugins/kubernetes/plugin.go:175-180`, `pkg/state/store.go:393-410` | Each informer handler writes the full object JSON, `managedFields` included, to `native_events` synchronously. The table is never pruned, and coverage event IDs include the generation, so each reconcile adds about 40 identical rows. | Batch native writes off the handler goroutine. Strip unused fields with `SetTransform`. Key coverage rows by content digest, and add retention. |
| Medium | `plugins/istio/authorizationpolicy.go:152`, `plugins/cilium/project.go:141-150`, `plugins/kubernetes/project_service.go:135` | Projectors use quadratic joins. Istio scans every Pod per targetRef although `index.byObject` exists. Cilium sorts all Pod keys for every rule. Services and NetworkPolicies match Pods with no label index. | Sort Pods once per namespace, use `byObject`, and add a label-to-Pods inverted index. |
| Medium | `plugins/istio/plugin.go:183`, `plugins/istio/index.go:58-66` | Each object exists in four or more live copies: informer, collection clone, reconcile deep copy, index deep copy, and the hub's JSON payload. At 100,000 Pods that is likely tens of GB. | Treat cached objects as immutable and share pointers. Decode once into compact typed structs. |

## Findings: detection, investigation and remediation

| Sev | Where | Problem | Reviewer's suggested fix |
| --- | --- | --- | --- |
| High | `pkg/reasoning/recovery.go:51`, `pkg/detector/events.go:219-233`, `pkg/reasoning/context.go:225-356` | `ReadChangeWindow` runs `ReadGraphCheckpoint`, a full compile, on every poll, even when idle. Each window rebuilds about 10 whole-graph maps, each investigation job copies the whole graph, and `graph_path` scans every edge per hop. | Check the sequence before compiling. Keep an in-memory graph updated from the outbox. Scope detection to the entities in the change locators, and give the MCP tools indexes. |
| High | `pkg/reasoning/recovery.go:84-88`, `pkg/reasoning/finding_sink.go:53-55` | A backlog of more than `ChangeLimit` (1,000) events rebases instead of being processed, and each rebase invalidates every active agentic finding. Once a window is slower than 1,000 outbox events arrive, detection becomes "rebase every poll". | Process a backlog in chunks. Keep findings across a rebase unless their evidence changed. |
| Medium | `plugins/kubernetes/remediation.go:216`, `plugins/istio/remediation.go:200`, `plugins/cilium/remediation.go:204` | Remediation calls `List(NamespaceAll)` on Pods with no selector at Plan, Prepare and Execute. At 300,000 Pods each list is hundreds of MB. | `Get` the Pod by namespace and name from the graph and compare UIDs, or read the shared informer collection, as AGENTS.md requires. |
| Medium | `pkg/reasoning/analysis.go:128-147`, `pkg/reasoning/context.go:62` | Any truncated retrieval rejects the candidate. A 4-hop traversal from almost any workload reaches a namespace or DNS hub and passes the 50-resource limit, so at scale nearly every paid investigation is rejected. | Reject only when a cited fact came from a truncated retrieval. Prune hub fan-out, and check truncation before calling the model. |
| Low | `pkg/reasoning/incident.go:19-23` | Incident history is one in-process ring of 1,024 baselines and 4,096 events for the whole cluster. A given anchor's baseline is usually evicted, so the model sees false novelty. | Query per-anchor baselines from the rollup store when needed. |

## Findings: rules, API and UI

| Sev | Where | Problem | Reviewer's suggested fix |
| --- | --- | --- | --- |
| High | `ui/src/App.tsx:118-126` | The UI downloads `/api/v1/graph` on load and again on every SSE `graph` event, whatever view is open. Telemetry changes the digest about 4 times a second. | Fetch the graph only on the graph view. Coalesce SSE events. Put telemetry-only revisions on their own event. Include display names in list responses. |
| Medium | `pkg/detector/workload_rules.go:30`, `pkg/state/deployment_authoring.go:653-708` | `MaxWorkloadRules=30000` is a hard limit. At 100,000 Deployments with at least one rule each, every rule reload fails and newly approved rules never activate. | Index rules per workload and load incrementally. Degrade instead of failing the whole set. |
| Medium | `pkg/api/rules.go:93-110` | `/rules` returns up to 30,001 proposals, and `/rule-drafts` is cut at the newest 500. The UI filters both client-side and polls them every 3 s. | Add `?resourceId=` and cursor pagination, and serve the review counts from an aggregate query. |

The contained fixes make `detector.Load` skip bad proposals instead of failing startup. Raising or removing the 30,000 limit belongs to this design.

## Architecture: the reviewer's recommendations, in order

The package boundaries are sensible: plugins own provider adapters, `pkg/graph` is a pure compiler, `pkg/state` owns publication, and telemetry and reasoning are separate pipelines. The contracts are strong. The problem is that every component treats "compile the full graph" as cheap, and nothing keeps that compile off the hot paths.

1. **Make the compiled graph a shared, incrementally maintained artifact.** Apply each publication's delta to the projection tables instead of rebuilding them. Keep one in-process view, cached by `GraphRevision`, for consumers that need the whole graph. Serve list, detail and search from indexed SQL.
2. **Shrink the unit of publication.** Split the Kubernetes contribution by namespace or kind, re-project only consumers of changed collections, and skip unchanged publishes. Bulk-load writes and narrow the global lock, or replace it with per-contribution ordering plus an outbox sequence.
3. **Take telemetry out of the versioned graph path.** Rollups change every few seconds and have no use for version history. Store leases and series in their own upserted tables, and publish to the graph on a minute cadence.
4. **Supervise components, not the process.** Replace the single errgroup with a supervisor that restarts each plugin, pipeline and worker with backoff, recovers panics, and reports health per component. Readiness should not depend on the full compile. *(The contained resilience fixes add panic recovery, retries and a cheap `/readyz`; the full supervisor is for this design.)*
5. **Keep the API out of storage internals.** `pkg/api` imports `pgconn` to retry SQLSTATE 40001 and 23505 (`pkg/api/server.go:18, 250-252`), and its `StateStore` interface returns a whole `GraphView`, so search and pagination live in the HTTP layer. A query interface on `state` would let the indexed reads in step 1 land without touching every handler.
6. **Share the plugin consumer machinery.** One `coherentcache` package for istio, cilium and agentgateway gives a single place to add dirty tracking and supervision. *(The extraction is part of the contained readability work; dirty tracking is for this design.)*

The binary split (service, offline author, MCP server, rules shim) and `cmd/agentshield/main.go` as a wiring script are fine. If wiring grows, move the component graph into an internal `app` package so it can be tested apart from flag parsing.

## Docs that disagree with the code on these topics

| Doc | Says | Code does |
| --- | --- | --- |
| [architecture/overview.md](/docs/architecture/), [publication-and-storage.md](/docs/architecture/publication-and-storage/) | List, detail and filter endpoints read the `current_*` projection tables | Every endpoint compiles through `Latest`. The tables are almost write-only. |
| [telemetry.md](/docs/architecture/telemetry/) | 24 h retention, at most 100,000 series | The cap dominates: about 69 always-on pairs fit in 24 h |
| [detection-rules.md](/docs/architecture/detection-rules/) | Up to 10,000 Deployment rules | `MaxWorkloadRules = 30000`, noted in code as about 5,000 workloads |

## Questions for the design

- Where does the in-process compiled view live, and who keeps it current: the store after each commit, or each consumer from the outbox?
- What replaces the global advisory lock while keeping publication atomic and the current graph coherent?
- How does a split Kubernetes contribution (per namespace or kind) keep "omission retracts" correct when a namespace disappears?
- Which telemetry state needs version history, if any? What is the graph-facing cadence, and how do leases expire without a retraction storm?
- How are the outbox and checkpoints chunked so that no single row grows with the contribution?
- What retention applies to `native_events`, contribution versions, change rows and unreferenced assertions?
- What is the read API shape (keyset pagination, filters, search) that replaces returning a whole `GraphView`?
- How do we measure progress? A synthetic load at 10,000, 50,000 and 100,000 workloads, with publish latency, read latency, DB round trips and memory as the metrics, would make each step checkable.
