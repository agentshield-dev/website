---
title: Enable reasoning
description: Point agentshield at a model and turn on agentic investigation, Deployment rule authoring, or both.
weight: 3
---

Findings need a model. Two features call one, and both are off by default.

| Feature | Flag | What it does |
| --- | --- | --- |
| Agentic investigation | `--agentic-investigation` | A model agent investigates built-in novelty signals, such as new communication paths, new exposure, and lost governance, and can promote findings. Needs an OpenAI Responses-compatible endpoint. |
| Deployment rule authoring | `--deployment-rule-authoring` | A model drafts detection rules for each Deployment Pod template revision from its observed behavior. Drafts run in shadow mode until you approve them. Works with OpenAI or Anthropic. |

Setting a model endpoint alone enables neither. Detection runs when either feature is on, and it never calls a model itself. An active rule's match is a finding with no model call. Without either feature you still get discovery, the graph and its change history, telemetry rollups, and the explorer and API for browsing them. You get no findings, so there is nothing to remediate.

Your graph data is sent to the model endpoint. Read [What the model sees](../../operations/security/#what-the-model-sees) first.

## Turn on agentic investigation

```sh
export AGENTSHIELD_MODEL_ENDPOINT=https://api.openai.com
export OPENAI_API_KEY=...
export AGENTSHIELD_AGENTIC_INVESTIGATION=true
make run
```

The service sends requests to `<endpoint>/v1/responses` using the OpenAI Responses API shape, with `store=false`. It sends the API key as a bearer token, and sends no credentials if no key is set, so you can point it at a gateway or proxy that attaches them instead.

## Turn on Deployment rule authoring

```sh
export AGENTSHIELD_DEPLOYMENT_RULE_AUTHORING=true
make run
```

Use the same endpoint and key as above. For Anthropic, set `ANTHROPIC_API_KEY` and pass `--model-provider anthropic`, which defaults the endpoint to `https://api.anthropic.com`. Anthropic supports only rule authoring and cannot be combined with agentic investigation.

A draft starts after a baseline window, 6 hours by default (`--deployment-rule-baseline-window`), and appears in the explorer's Rules view for review. Click **Author now** to skip the wait. See [Detection rules](../../concepts/rules/#deployment-rules).

## Choose a model

| Flag | Environment variable | Default | Meaning |
| --- | --- | --- | --- |
| `--model-endpoint` | `AGENTSHIELD_MODEL_ENDPOINT` | empty | Model API base URL. |
| `--model-api-key` | `AGENTSHIELD_MODEL_API_KEY`, then `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` | none | API key. Prefer the environment. |
| `--model-provider` | none | `openai` | `openai` or `anthropic`. |
| `--model` | `AGENTSHIELD_MODEL` | `gpt-6-astra` | Model name sent with each request. |
| `--model-reasoning-effort` | `AGENTSHIELD_MODEL_REASONING_EFFORT` | empty | Reasoning effort for compatible providers, for both features. |

Model quality decides how much an investigator finds. Run the [evals](../../operations/evals/) against the model you plan to use. `make eval-matrix` compares several.

## Bound the spend

Agentic investigation drains its own durable queue, so a slow or failing model never delays detection. Four settings bound its spend.

| Flag | Default | Meaning |
| --- | --- | --- |
| `--agentic-investigation-batch-window` | `30s` | How long a queued investigation waits so later windows that share a resource join it. |
| `--agentic-investigation-sample-rate` | `1` | Fraction of medium-risk investigations that run. High and critical ones always run. |
| `--agentic-investigation-dedup-window` | `1h` | Skip an investigation whose signal pattern was already investigated within this window. |
| `--agentic-investigation-max-per-hour` | `0`, unlimited | Investigations started in any trailing hour. Over budget, medium-risk jobs are skipped and high-risk jobs wait. |

With the defaults, only batching and deduplication limit spend. Rule authoring is not sampled or budgeted. It makes one call per Pod template revision, including every Deployment already in the graph when you turn it on.

## Retrieval modes

`--agentic-investigation-retrieval` selects how the investigator gets graph context.

- `model_selected`, the default, lets the model choose which of the six read-only tools to call, and with what arguments.
- `deterministic` has the service fetch the baseline, timeline, a default graph path, and governance posture first. The model can still make more calls.

## What happens next

Each graph change that matters is written to a transactional change feed. Detection checks whether it is new, and records what it found. A match of an active rule becomes a finding. An eligible novelty signal is queued for investigation, and a model response becomes a finding only if it passes validation. See [Detection](../../concepts/detection/) and [Reasoning](../../concepts/reasoning/).

Findings appear in the explorer with their evidence. For findings from an investigation, the fixes you can apply appear next to them. See [Remediation](../../concepts/remediation/).
