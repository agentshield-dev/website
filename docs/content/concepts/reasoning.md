---
title: Reasoning
description: How a novelty signal becomes a finding through a model investigation, and why a model's answer never decides on its own.
weight: 6
---

Agentic investigation is optional. The model is an advisory investigator. The service stays authoritative for graph state, retrieval bounds, evidence, and promotion. Investigation runs from its own queue, so a slow or failing model never delays [detection](../detection/).

## From signal to finding

1. **Detection queues a signal.** A built-in novelty signal of medium risk or higher goes to the investigation queue with its change range, its signals, and incident context scoped to the signals' anchors.
2. **The queue admits it.** Requests that share an anchor coalesce into one job. A worker applies sampling, deduplication, and the hourly budget before it calls the model.
3. **The model gets a small packet.** Resource IDs, kinds, typed security semantics, opaque evidence handles, and the signals. No telemetry and no provider-native configuration.
4. **It investigates with read-only tools.** Each result is bounded and pinned to the packet's analysis token.
5. **The harness validates.** See below.
6. **A finding is promoted or dropped.**

## The investigation queue

Requests that share an anchor coalesce into one queued job while its batch window, `--agentic-investigation-batch-window` (30 seconds), is open, as long as the combined change range stays within 1,000 changes. The worker claims the highest-risk job first, oldest first within a risk. Before it calls the model, it drops anchors that have left the graph, and skips the job as `stale` if no eligible signal remains. Then three controls apply.

1. **Rate sampling.** `--agentic-investigation-sample-rate` (default 1) runs that fraction of medium-risk jobs. High and critical jobs always run. The decision is a deterministic function of the job's signal IDs, so retries agree.
2. **Deduplication.** `--agentic-investigation-dedup-window` (default one hour) skips a job whose fingerprint, the risk, reasons, and anchors of its eligible signals, was already investigated within the window. Failed jobs do not count.
3. **Budget.** `--agentic-investigation-max-per-hour` (default unlimited) caps investigations started in any trailing hour. Over budget, medium-risk jobs are skipped and high and critical jobs wait a minute and retry.

A skipped job ends `sampled_out` with its reason, `stale`, `sampled`, `duplicate`, or `budget`, and never calls the model. A failed job retries with backoff, up to `--agentic-investigation-max-attempts` (5) before it fails permanently. Inspect the queue with `agentshield rules investigations`.

## The packet

The worker re-reads the job's change range and builds a compact packet against the current graph checkpoint, which can be newer than the window that produced the request. The packet records both. It holds the non-telemetry assertions added and retracted in the range, the topology classification, the affected resources with their decoded security semantics and evidence IDs, the novelty signals, suggested anchors, and a fixed telemetry time window. It holds at most 100 resources, 250 relationships, 250 facets, and 100 telemetry entries, with counts of anything left out.

The packet does not hold telemetry, provider-native configuration, precomputed attack paths, rule signals, or any hint about the expected answer. Its analysis ID, graph digest, and telemetry window pin every later query to the exact state that was analyzed.

## The six tools

| Tool | Returns |
| --- | --- |
| `get_security_neighborhood` | The one-hop security neighborhood of the anchor resources |
| `get_telemetry_chain` | Bounded runtime observations connected to the anchors |
| `get_governance_posture` | Governance relationships and facets, without inferring policy effect |
| `find_graph_paths` | The bounded multi-hop subgraph of resources, relationships, and facets reachable from the anchors within a fixed hop limit. It does not list individual paths. Follows every relationship except `runs-on` unless the model names the predicates it wants. |
| `get_incident_timeline` | Bounded, ordered observations across the current incident |
| `get_behavior_baseline` | Bounded, previously observed communication behavior |

## Validation

A model answer becomes a finding only if all of these hold. The model answers with strict structured output through the OpenAI Responses API.

- The model chose `candidate_finding`.
- The category is not `new_observed_communication`. Novelty without a security consequence is rejected.
- It cites a signal from the packet, entities from the packet, fact IDs the graph returned, and evidence IDs attached to those facts. A wrong reference gets one correction turn, with the validation error and an allowlist of valid IDs and no tools. A second failure is final.
- It selects at least one signal of medium risk or higher. Only those signals are promoted.
- No query it relied on hit its bound. Truncated retrieval blocks promotion.

Remediation suggestions that do not apply to the packet are dropped before the finding is stored. A baseline packet, or one with no signals, is suppressed and never becomes a finding.

## Findings

Every finding has an `origin`.

| Origin | Created by | Carries |
| --- | --- | --- |
| `agentic_investigation` | A validated model assessment | The model's category, severity, and uncertainty, and up to eight remediation suggestions |
| `detection_rule` | A match of an active [rule](../rules/), with no model call | The rule ID and revision, the category `detection_rule_match`, the rule's risk as severity, and no suggestions |

Fields of an investigated finding:

| Field | Values |
| --- | --- |
| `category` | `new_observed_communication`, `boundary_crossing`, `loss_of_governance`, `new_exposure`, `identity_reuse`, `possible_lateral_path`, `unknown_security_effect` |
| `severity` | `none`, `low`, `medium`, `high` |
| `modelUncertainty` | `low`, `medium`, `high` |

An investigated finding also lists its summary, affected entities, claims, stated uncertainties, signal IDs, and up to eight remediation suggestions. Each suggestion names one outcome from a closed list, one affected target, and no provider payload, patch, or command. Duplicate outcome and target pairs are rejected.

Finding IDs are deterministic: `finding:sha256:<hex>`, derived from the promoted signal IDs and the graph digest. A later change that touches an affected entity invalidates an investigated finding. Because the worker investigates after detection has moved on, it also checks the changes committed after its packet was built, and invalidates a new finding at once if they touched its resources. Invalidated findings stay available for audit but cannot launch a remediation.

A rule finding records that a rule matched, which later graph changes do not make untrue, so it is never invalidated automatically.

## Retrieval modes

`--agentic-investigation-retrieval` selects how the investigator gets graph context.

- `model_selected` lets the model choose which tools to call.
- `deterministic` has the service fetch the behavior baseline, the incident timeline, a default graph path, and the governance posture first. The model can still make more calls.

The number of model tool calls is not capped. Per-result size limits, the pinned token, request cancellation, and the model's context window bound each investigation. This setting is for measuring model capability, not a production cost control. Use the sampling and budget flags for that.

## What it does not do

Reasoning does not apply anything. It attaches desired outcomes to a finding, and [remediation](../remediation/) takes over from there. It does not reconstruct history: on a restart it analyzes the current state, not what changed while the service was down. Results are advisory, not proof of correctness. Incident history spans one process run and is not stored durably.
