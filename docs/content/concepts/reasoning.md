---
title: Reasoning
description: How a graph change becomes a finding, and why a model's answer never decides on its own.
weight: 4
---

Reasoning is optional. The model is an advisory investigator. The service stays authoritative for graph state, retrieval bounds, evidence, and promotion.

## From change to finding

1. **A change lands.** Each publication that matters to reasoning writes one ordered event to the outbox in the same transaction. Telemetry-only updates do not.
2. **A detector asks whether it is new.** It compares the previous graph with a coherent checkpoint. A resource becoming externally addressable, typed semantics disappearing, or a `governed-by` edge being retracted raises a high-risk signal. A change to an existing typed envelope raises a medium-risk one. For telemetry, a new communication pair and a sensitive destination role raise a novelty score, and only scores that meet the minimum become signals. Windows with no signal never reach a model.
3. **The model gets a small packet.** Resource IDs, kinds, typed security semantics, opaque evidence handles, and the signals. No telemetry and no provider-native configuration. A packet holds at most 100 resources, 250 relationships, 250 facets, and 100 telemetry entries.
4. **It investigates with read-only tools.** Each result is bounded and pinned to the packet's analysis token.
5. **The harness validates.** See below.
6. **A finding is promoted or dropped.**

## The six tools

| Tool | Returns |
| --- | --- |
| `get_security_neighborhood` | The one-hop security neighborhood of the anchor resources |
| `get_telemetry_chain` | Bounded runtime observations connected to the anchors |
| `get_governance_posture` | Governance relationships and facets, without inferring policy effect |
| `find_graph_paths` | Bounded graph paths from the anchors. Follows every relationship except `runs-on` unless the model names the predicates it wants. |
| `get_incident_timeline` | Bounded, ordered observations across the current incident |
| `get_behavior_baseline` | Bounded, previously observed communication behavior |

## Validation

A model answer becomes a finding only if all of these hold.

- The model chose `candidate_finding`.
- The category is not `new_observed_communication`. Novelty without a security consequence is rejected.
- It cites a signal from the packet, entities from the packet, fact IDs the graph returned, and evidence IDs attached to those facts. A wrong reference gets one correction turn.
- It selects at least one signal of medium or high risk. Only those signals are promoted.
- No query it relied on hit its bound. Truncated retrieval blocks promotion.

Remediation suggestions that do not apply to the packet are dropped before the finding is stored. A baseline packet, or one with no signals, is suppressed and never becomes a finding.

## Findings

| Field | Values |
| --- | --- |
| `category` | `new_observed_communication`, `boundary_crossing`, `loss_of_governance`, `new_exposure`, `identity_reuse`, `possible_lateral_path`, `unknown_security_effect` |
| `severity` | `none`, `low`, `medium`, `high` |
| `modelUncertainty` | `low`, `medium`, `high` |

A finding also lists its summary, affected entities, claims, stated uncertainties, signal IDs, and up to eight remediation suggestions. Each suggestion names one outcome from a closed list, one affected target, and no provider payload, patch, or command. Duplicate outcome and target pairs are rejected.

Finding IDs are deterministic: `finding:sha256:<hex>`, derived from the promoted signal IDs and the graph digest. A later change that touches an affected entity invalidates older findings. They stay available for audit but cannot launch a remediation.

## Retrieval modes

`--reasoning-retrieval` selects how the investigator gets graph context.

- `model_selected` lets the model choose which tools to call.
- `deterministic` has the service fetch the behavior baseline, the incident timeline, a default graph path, and the governance posture first. The model can still make more calls.

## What it does not do

Reasoning does not apply anything. It attaches desired outcomes to a finding, and [remediation](../remediation/) takes over from there. It also does not reconstruct history: on a restart it analyzes the current state, not what changed while the service was down.
