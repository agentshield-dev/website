---
title: Enable reasoning
description: Point agentshield at a model endpoint so it can investigate graph changes and write findings.
weight: 2
---

Reasoning is off until you set a model endpoint. Without one, the graph and telemetry still materialize and the explorer works, but no findings are produced and there is nothing to remediate.

## Set the endpoint

```sh
export AGENTSHIELD_MODEL_ENDPOINT='<your OpenAI-compatible endpoint>'
make run
```

The service sends requests to `<endpoint>/v1/responses` using the OpenAI Responses API shape. It sends no credentials of its own, so point it at a gateway or proxy that attaches them.

## Choose a model

| Flag | Environment variable | Default | Meaning |
| --- | --- | --- | --- |
| `--model-endpoint` | `AGENTSHIELD_MODEL_ENDPOINT` | empty | Endpoint to call. Empty turns reasoning off. |
| `--model` | `AGENTSHIELD_MODEL` | `gpt-6-astra` | Model name sent with each request. |
| `--reasoning-effort` | `AGENTSHIELD_REASONING_EFFORT` | empty | Reasoning effort passed through to the Responses API. |
| `--reasoning-retrieval` | `AGENTSHIELD_RETRIEVAL_MODE` | `model_selected` | How the investigator gets graph context. |
| `--reasoning-interval` | none | `1s` | How often the service polls for graph changes. |
| `--reasoning-consumer` | none | `reasoning/default` | Stable ID of the durable change-feed consumer. |

Model quality decides how much an investigator finds. Run the [evals](../../operations/evals/) against the model you plan to use. `make eval-matrix` compares several.

## Retrieval modes

- `model_selected` lets the model choose which of the six read-only tools to call, and with what arguments.
- `deterministic` has the service fetch the baseline, timeline, a default graph path, and governance posture first. The model can still make more calls.

## What happens next

Each graph change that matters to reasoning is written to a transactional outbox. A detector checks whether it is new. Only changes with a signal reach the model. A model response becomes a finding only if it passes validation. See [Reasoning](../../concepts/reasoning/).

Findings appear in the explorer with their evidence. Fixes you can apply appear next to them. See [Remediation](../../concepts/remediation/).
