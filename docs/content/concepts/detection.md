---
title: Detection
description: How graph changes become signals, and where each signal goes, to a rule finding, a shadow record, or the investigation queue.
weight: 4
---

Detection turns graph changes into signals. It reads the change feed and runs deterministic detectors, and it never calls a model. A signal says "look at these resources" and carries a risk level, reasons, and anchor resources. It is not a finding yet.

Detection runs when `--agentic-investigation` or `--deployment-rule-authoring` is on. There is no detection-only mode. See [Enable reasoning](../../getting-started/enable-reasoning/).

## From change to signal

1. **A change lands.** Each publication that matters writes one ordered event to the change feed, the `graph_change_outbox` table, in the same transaction. Telemetry-only rollup updates do not, except when a `communicates-with` or `executes` lease edge is created, refreshed near expiry, or retracted.
2. **A window is read.** Every `--detection-interval` (1 second), the service reads the events after its cursor, up to a coherent graph checkpoint, and compares the previous graph with the checkpoint once instead of event by event. A window covers at most 1,000 changes.
3. **Detectors run.** Built-in checks always run. Active CEL rules and approved Deployment rules run beside them. See [Detection rules](../rules/).
4. **The result is recorded.** Every signal is stored in `detection_signals` with what happened to it, and then the cursor advances.

Detectors read only security semantics, registered predicates, neutral attributes such as `network/role`, and telemetry fingerprints. They never read provider-specific fields.

## Built-in checks

Built-in checks always run, whatever ruleset is active. A signal of medium risk or higher can lead to a finding. A low-risk signal is only recorded, and anything lower is dropped.

| Check | Fires when | Risk |
| --- | --- | --- |
| New communication path | A resolved `communicates-with` edge creates a workload-level path for a source that already had observed traffic | Medium |
| New communication path, first activity | The same, for a source with no prior traffic, such as a new workload | Low |
| Traffic novelty | Telemetry shows a new workload-level pair | Low |
| New exposure | Security semantics become externally addressable | High |
| Removed semantics, lost governance | Security semantics are removed, or a `governed-by` edge disappears | High |
| Changed semantics | Exposure or governance semantics change | Medium |
| Sensitive resource created | A Kubernetes RoleBinding, ClusterRoleBinding, or admission webhook configuration is created | Medium |
| Workload identity changed | A workload's instances start using a service account they did not use before | Medium |

A destination with the `control-plane-api` role, the Kubernetes API, or a public address raises the risk of a communication path.

Novelty is compared per workload. A Pod is folded into the controller that instantiates it, so a rollout, restart, or scale-up whose new Pods reach known destinations produces nothing. Ordinary topology churn, such as new Pods, Services, ConfigMaps, labels, and structural edges, produces no signal either.

## Where a signal goes

| Signal | What happens |
| --- | --- |
| Match of an active rule, an operator-activated CEL rule or an approved Deployment rule | A finding, with no model call |
| Match of an unreviewed Deployment rule | Recorded only, in shadow mode |
| Built-in signal of medium risk or higher | Queued for [agentic investigation](../reasoning/) |
| Anything else | Recorded, with no further action |

Each signal is recorded as `rule_finding`, `shadow`, `queued`, `below_threshold`, `disabled` when agentic investigation is off, or `investigated`. Signals are kept for `--detection-signal-retention`, seven days by default. Inspect them with `agentshield rules signals`.

Findings are never published back into the graph, so a finding cannot trigger detection.

## Restarts

The store cannot rebuild the graph at an old sequence. On first start, or when the stored cursor lags the current checkpoint after a restart, the service records a `startup_without_historical_snapshot` rebase and starts from the current graph. It does not claim to have analyzed changes made while it was down.

The result of a window is recorded before the cursor moves. A crash between the two leaves the cursor behind, so the next start rebases instead of detecting that window again. Signal and finding IDs are deterministic, so anything recorded twice is stored once.

## Known gap

Detection runs only when a change window exists. A telemetry rule that watches for a new operation or outcome on a pair that already communicates, such as a new `denied` response on an existing path, is evaluated at the next unrelated graph change. If the rollup's 24-hour retention drops the combination first, it is never evaluated. Relationship rules are not affected.
