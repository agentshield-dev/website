---
title: Publication and storage
description: >-
  Atomic publication, contribution generations, PostgreSQL storage, change
  feeds, and migrations.
weight: 50
---
This page is the reference for how contributions are published and stored in PostgreSQL: the publication transaction, generations, the current graph tables, the change feed (outbox), manifests, and schema migrations. Other pages link here instead of repeating it. The concepts (identity, assertions, what a contribution is) are in the [data model](/docs/concepts/data-model/).

Code: `pkg/state/versioned.go`, `pkg/state/store.go`, `pkg/state/changes.go`, and `pkg/state/migrations/`.

## The publication transaction

A plugin publishes by calling `Runtime.ReplaceContribution` with a `discovery.ContributionOutput`: the contribution name, generation, complete `graph.Input`, source observation time, readiness, and source health. The store compiles the input with the graph compiler first. If compilation fails, nothing is written.

It then runs one PostgreSQL transaction. It first takes the graph-wide publication lock (`pg_advisory_xact_lock`), which commit or rollback releases. Each publication is bounded so that one slow publisher cannot hold pooled connections, or the lock, indefinitely. `state.Config` sets the defaults: the whole publication has 5 minutes, which is also its `idle_in_transaction_session_timeout`. The transaction sets `lock_timeout` (2 minutes, which includes the wait for the publication lock) and `statement_timeout` (2 minutes). A publication that times out rolls back and returns an error. The numbered steps below match the `Step N` comments in `publishContribution`:

1. Resolve the stable contribution ID for `(plugin ID, source ID, name)`, creating the row if needed.
2. Compare the generation and input digest against the current head (see [generations](#generations)).
3. Persist assertion content. Rows are keyed by SHA-256, so identical assertions from different contributions or generations share one row.
4. Record an immutable contribution version and point the head at it.
5. Replace the contribution's active membership wholesale and record what was added and retracted as deltas. On a contribution's first publication, and whenever the generation is a multiple of 20, also write a full membership checkpoint.
6. Recompile the union of every active contribution and replace the current projection tables. A relationship that stays unresolved keeps its `first_seen_at` across the rewrite. In the same step, enqueue a Deployment rule-authoring job for every Deployment Pod template revision that has none (see [Detection rules](/docs/architecture/detection-rules/#trigger-and-queue)).
7. Append one change-feed event, unless the [telemetry exclusion](#what-the-change-feed-excludes) applies.

Then it commits. `ReplaceContribution` then reads the current graph with `Latest` to return it. A failure of that read is logged, not returned, because the publication has already committed.

Any failure rolls back the whole transaction. Readers see either the previous state or the complete new one; there are no partial publications. If a plugin's projection or publication fails, its last successful contribution stays active.

### Why one lock

Step 6 rebuilds the projection from every contribution. Two concurrent publishers would each compile a union that misses the other's change, and the later commit would win with a stale view. The global lock prevents that and also makes change-feed sequence numbers follow commit order. The cost is that all publications are serialized. The planned fix is incremental projection updates under per-contribution locks; the schema and delta format already allow it.

## Generations

Each contribution has a generation number that must increase with each replacement.

| Submitted generation | Result |
| --- | --- |
| Lower than the head | Rejected as stale. |
| Equal, same input digest | Idempotent retry. Returns the existing version and writes nothing. |
| Equal, different input digest | Rejected. One generation names exactly one content. |
| Higher | New version, even if the graph content is unchanged. |

A higher generation with unchanged content still creates a version because readiness, health, and observation time are part of the version.

Plugins call `ContributionGeneration(plugin, source)` at startup and continue from the stored maximum, so generations keep increasing across restarts.

### Status

The head status is derived from the version:

| Status | When |
| --- | --- |
| `active` | Ready and source health `healthy`. |
| `degraded` | Ready and source health `degraded`. |
| `stale` | Not ready, or any other source health. |
| `retired` | Published by `RetireContribution`. |

`degraded` and `stale` contributions keep their last membership in the graph. A plugin that loses its provider connection should republish its last good input with degraded health rather than an empty or partial one.

`RetireContribution` publishes an empty final version and retracts everything the contribution owned. Use it only when a source is removed on purpose. The runtime does not call it automatically; for example, pointing the AWS plugin at a different account creates a new source ID, and the old source must be retired separately.

## The current graph

There are two ways to read the current graph. Both use the same compiler.

- **On read.** `Store.Latest` loads every active assertion in one repeatable-read snapshot and checks each one against its owning contribution. It ends the transaction, compiles the assertions, and returns the graph with its SHA-256 digest. Ending the transaction first means the CPU-bound compile does not hold a pooled connection. `GET /api/v1/graph` uses this.
- **During publication.** Step 6 compiles the same union and replaces the `current_*` tables. List, detail, and filter endpoints read these tables.

Because both paths run the same pure compiler over the same assertions, they agree.

## The change feed

`graph_change_outbox` is a transactional outbox. Each row holds one `ContributionChangeEvent` for one published contribution version:

- a global sequence number, assigned from a single-row counter under the publication lock, so sequences have no gaps and follow commit order;
- the contribution's plugin, source, name, generation, status, readiness, and source health;
- the non-telemetry assertions added and retracted. Each one carries an entity locator (the graph entity type and ID, and for relationships the subject, predicate, and object), so a consumer can act on a retraction without reading the retracted row.

The event is built from the membership delta already computed in step 5. Publication never compares whole graphs and never waits for a consumer.

Contribution generations cannot order events across plugins, because each contribution counts independently. Consumers use the outbox sequence instead.

### What the change feed excludes

Telemetry rollups change every batch. If they produced events, telemetry volume would set the pace of reasoning. So:

- Telemetry assertions are always removed from event payloads, including in contributions that also own inventory.
- A version whose only changes are telemetry assertions, with unchanged readiness, health, and status, gets no event. It still commits and updates the current graph.
- A version with no assertion changes but a new generation still gets an (empty) event, so consumers see the new version.
- Readiness, health, and status changes always produce an event.

The lease relationships that the telemetry rollup maintains (`communicates-with`, and `executes` for process executions) are relationship assertions, not telemetry assertions. Their creation, refresh, and expiry do produce events, so a Pod's first shell wakes detection and reasoning once. See [Telemetry](/docs/architecture/telemetry/#leases).

### Reading the change feed

- `ReadContributionChanges(after, limit)` returns events in sequence order.
- `ReadGraphCheckpoint` returns the latest committed sequence and the current graph, read in one repeatable-read snapshot so they match. The graph may include newer telemetry rollups that had no event.
- `reasoning_cursors` stores one `(through_sequence, graph_sha256)` position per consumer ID. Writing the same position with the same digest is a no-op; moving backwards, or the same position with a different digest, fails.

How the detection service uses these is described in [Change feed and reasoning](/docs/architecture/change-feed-and-reasoning/#consuming-the-change-feed). Today there is one consumer. Consumer groups, outbox retention, and external streaming are not implemented.

## Manifests and history

`CreateManifest` (and `GET /api/v1/manifest`) records an immutable list of the active version of every non-retired contribution, plus status counts, read in one repeatable-read transaction. The manifest ID is derived from its content, so the same set of versions reuses the same manifest. A manifest ID plus an evaluation time is an *analysis-view token*: it identifies exactly which graph a reasoning result used.

The store keeps everything needed to rebuild the graph for an old manifest: immutable assertion content, immutable versions, per-version add/retract deltas, and periodic full checkpoints. The service that rebuilds a historical graph, and an API that serves one, are not implemented yet. Any future retention or garbage collection must keep every checkpoint and delta chain that a retained manifest still references.

## Tables

| What | Tables |
| --- | --- |
| Provider observations | `native_events` |
| Resource identities | `resource_identities` |
| Contributions and versions | `contributions`, `contribution_versions`, `contribution_heads` |
| Assertion content | `resource_assertions`, `facet_assertions`, `relationship_assertions`, `telemetry_assertions` |
| Active membership | `contribution_current_assertions` |
| History | `contribution_version_changes`, `contribution_checkpoints` |
| Current graph | `current_resources`, `current_facets`, `current_relationships`, `unresolved_relationships`, `assertion_conflicts` |
| Change feed | `graph_change_outbox`, `graph_change_sequence` |
| Detection and investigation | `reasoning_cursors`, `detection_signals`, `investigation_jobs`, `findings` (with `origin` `agentic_investigation` or `detection_rule`) |
| Manifests | `graph_manifests`, `graph_manifest_contributions` |
| Detection rules | `detector_rule_revisions`, `detector_rulesets`, `detector_ruleset_members`, `detector_activations`, `detector_active_ruleset` |
| Rule authoring | `deployment_rule_jobs` (drafts and their review status) |

Assertion tables use typed columns for fields that are queried and JSONB for attributes, properties, and evidence IDs.

PostgreSQL does not store complete provider payloads beyond native events, complete graph snapshots, or raw telemetry. Raw telemetry goes to JSONL or ClickHouse (see [Telemetry](/docs/architecture/telemetry/)).

`native_events` stores provider observations for evidence. Kubernetes Secrets are stored with metadata and a sorted list of key names only; values, type, and annotations are never stored.

## Schema migrations

Migrations are SQL files in `pkg/state/migrations/`, embedded into the binary. `state.Open` applies pending migrations at startup in one transaction while holding a PostgreSQL advisory lock, so several processes can start at once. Each applied migration's SHA-256 is recorded in `schema_migrations`; if an embedded file no longer matches, startup fails. Migration does not inherit the caller's startup deadline. It runs under its own `state.Config.MigrationTimeout`, which defaults to 30 minutes, because rebuilding a constraint on a large table can take longer than a short startup budget.

Rules for contributors:

- Add a new numbered file for every schema change. Never edit a migration that has been applied anywhere.
- Update constraints when you add a predicate or assertion type. To widen a `CHECK` on a table that grows without bound, such as `relationship_assertions`, drop it and add the new one `NOT VALID`. Existing rows already satisfy the narrower constraint, so the full-table scan is unnecessary, and new rows are still checked.
- Run `make test-postgres` for any storage change.

The database role needs DDL rights the first time the service starts (and after an upgrade that adds migrations). See [PostgreSQL setup](https://github.com/solo-io/agentshield/blob/main/deploy/kubernetes/README.md#postgresql).
