---
title: Evals
description: Six campaigns, three attacks and their benign twins, run against a disposable cluster and a model.
weight: 3
---

The evals measure whether agentshield catches lateral movement without alerting on benign changes. Six longitudinal campaigns pair attacks with controls: a compromised application reaching a secrets manager, unauthorized Hugging Face Spaces secret access, and an identity-provider compromise modeled after the Solo Keycloak incident.

Each campaign records baseline and observed traffic from a disposable cluster. Scoring starts only after the exact plugin-produced observation reaches the graph. Synthetic telemetry is rejected. Expected outcomes stay in the scorer and never enter the model context.

## Campaigns

| Campaign | Class | Story | Expected |
| --- | --- | --- | --- |
| `checkout-to-secrets-manager` | Attack | A compromised checkout workload reaches the payment signing key | `candidate_finding`, `possible_lateral_path` |
| `governed-secret-rotation` | Benign | A declared rotation controller reads the same key | `no_finding` |
| `huggingface-spaces-secrets-access` | Attack | A compromised Spaces worker pivots from model access to the secrets API | `candidate_finding`, `possible_lateral_path` |
| `huggingface-governed-secrets-access` | Benign | A declared secrets controller reads secrets | `no_finding` |
| `keycloak-to-github-proxy` | Attack | A leaked OIDC secret leads to Keycloak admin, then the internal GitHub proxy | `candidate_finding`, `possible_lateral_path` |
| `governed-github-repository-inventory` | Benign | A declared inventory controller reads the GitHub proxy | `no_finding` |

Every campaign requires telemetry backing. The earliest phase that can raise a finding is the observed phase.

## Run

Create the disposable cluster, verify it, and run all campaigns with `gpt-6-astra`. The cluster runs agentgateway in front of the model, and the key is stored as a secret there. The preflight check fails without it.

```sh
export OPENAI_API_KEY=...
make eval-up
make eval-check
make eval-run
```

Run selected campaigns, or the model matrix:

```sh
evals/scripts/eval-run.sh --campaigns keycloak-to-github-proxy,governed-github-repository-inventory
make eval-matrix
```

The matrix uses the Responses API with low reasoning effort. It compares model-selected and deterministic retrieval on `gpt-5-mini`, then tests deterministic retrieval on `gpt-5.4-nano`, `gpt-6-luna`, `gpt-5.6-sol`, and `gpt-6-astra`.

Delete the cluster with `make eval-down`. The script verifies local and in-cluster ownership first.

## Results

Artifacts are written under `evals/output/<timestamp>/`. Observation failures make a run incomplete instead of counting as model misses.

The runner uses the production reasoning service with a compact initial packet and a pinned graph view. Model-selected tool calls are uncapped, but every result stays bounded. `untruncated` means every matching fact in that pinned view fit within the query bounds. It does not claim that provider observation is complete, and truncated context cannot support promotion.
