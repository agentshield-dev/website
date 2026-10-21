---
title: Evals
description: Six campaigns, three attacks and their benign twins, run against a disposable cluster and a model, plus detector-only runs and a rule suite.
weight: 4
---

The evals measure whether agentshield catches lateral movement without alerting on benign changes. Six longitudinal campaigns pair attacks with controls: a compromised application reaching a secrets manager, a compromised hosted ML workspace build worker reading workspace secrets, and a compromised single sign-on server enumerating private source repositories.

Each campaign records baseline and observed traffic from a disposable cluster. Scoring starts only after the exact plugin-produced observation reaches the graph. Synthetic telemetry is rejected. Expected outcomes stay in the scorer and never enter the model context.

Six campaigns are a smoke test of the end-to-end path, not a measure of detection rates in general. There are no published results yet.

## Campaigns

| Campaign | Class | Story | Expected |
| --- | --- | --- | --- |
| `checkout-to-secrets-manager` | Attack | A compromised checkout workload reaches the payment signing key | `candidate_finding`, `possible_lateral_path` |
| `governed-secret-rotation` | Benign | A declared rotation controller reads the same key | `no_finding` |
| `ml-workspace-secrets-access` | Attack | A compromised ML workspace build worker pivots from model access to reading workspace secrets | `candidate_finding`, `possible_lateral_path` |
| `governed-ml-workspace-secrets-access` | Benign | A declared secrets controller reads workspace secrets | `no_finding` |
| `identity-provider-to-source-control` | Attack | A compromised single sign-on server pivots from its identity-provider traffic to enumerate private repositories through an internal source-control API it has never called | `candidate_finding`, `possible_lateral_path` |
| `governed-repository-inventory` | Benign | A declared inventory controller queries private repository metadata through its declared path | `no_finding` |

Every campaign requires telemetry backing. The earliest phase that can raise a finding is the observed phase.

## Run

The disposable kind cluster runs Cilium with Hubble, MetalLB, Gateway API, Istio ambient, agentgateway, an OpenTelemetry Collector, PostgreSQL, and agentshield. It also installs Falco, which posts shell alerts to the collector. agentgateway sits in front of the model, and the key is stored as a secret there. The preflight check fails without it.

You need Docker, kind, kubectl, helm, jq, sha256sum, Go, and enough local resources for the multi-component cluster. Run these commands from the product source checkout. Build the embedded UI with `make ui` before `make eval-up` if you want to inspect the explorer.

Create the cluster, verify it, and run all campaigns with `gpt-6-astra`:

```sh
export OPENAI_API_KEY=...
make eval-up
make eval-check
make eval-run
```

The cluster uses its own kubeconfig at `evals/output/kubeconfig`; your current kubectl context is not changed. To inspect its graph, run:

```sh
kubectl --kubeconfig evals/output/kubeconfig -n agentshield-system port-forward service/agentshield 8088:8088
```

Open `http://127.0.0.1:8088`. Live remediation is disabled because the in-cluster service listens on a non-loopback address.

`make eval-run` makes real model calls, billed to your key. Run selected campaigns, or the model matrix:

```sh
evals/scripts/eval-run.sh --campaigns identity-provider-to-source-control,governed-repository-inventory
make eval-matrix
```

The matrix uses the Responses API with low reasoning effort. It compares model-selected and deterministic retrieval on `gpt-5-mini`, then tests deterministic retrieval on `gpt-5.4-nano`, `gpt-6-luna`, `gpt-5.6-sol`, and `gpt-6-astra`.

Delete the cluster with `make eval-down`. The script verifies local and in-cluster ownership first.

The in-cluster agentshield also runs Deployment rule authoring against OpenAI with the same key. Drafts start after a 10-minute baseline window instead of the 6-hour default, and `--rule-review-api` serves the rule review routes on the cluster listener so the Rules view works through `kubectl port-forward`. Open a shell in a Pod, for example `kubectl exec -it deploy/<name> -- sh`, and the Pod gains an `executes` edge to the `shell` process class. See [Falco](../../plugins/falco/).

## Detector-only runs

Detector-only mode measures deterministic detection without agentgateway, an API key, or model calls:

```sh
AGENTSHIELD_EVAL_DETECTOR_ONLY=1 make eval-up
AGENTSHIELD_EVAL_DETECTOR_ONLY=1 make eval-run
```

Use it for built-in detector changes. A detector change should keep `detection.securityPathRecall` at 1 and should not add agent invocations to the `setup` or `baseline` phases, which contain only expected operational change. Then confirm with a model run.

## Rule evals

`make eval-rules` scores the deterministic rules engine. It is separate from the campaigns above, which measure agentic investigation. Its nine campaigns pair four attacks with five benign controls, and each is built around the inputs rules evaluate: a source workload whose name implies a narrow role, the services it calls, baseline requests, and observed requests.

| Kind | Campaigns |
| --- | --- |
| Attack | `storefront-reads-secrets`, `metrics-exporter-deletes-inventory`, `report-job-probes-admin`, `static-site-calls-accounts-api` |
| Benign | `storefront-reads-another-cart`, `storefront-rollout`, `metrics-exporter-scrapes-new-service`, `report-job-reads-weekly-report`, `static-site-rollout` |

The attacks are a request outside the workload's API surface, a write by a read-only workload, a request the mesh denies, and an outbound call from a workload that should make none.

Two rule sources are scored for each campaign. The `policy` source is operator-written CEL rules run as the active ruleset, which checks rule execution end to end on live telemetry and runs in every mode, including detector-only. The `authored` source is the rule the Deployment rule author drafts after the baseline phase, run as an approved rule. It needs a model, so detector-only runs skip it.

A security campaign is a true positive when a rule finding in the observed window is anchored to the source and its last observed target. A benign campaign is a true negative when no rule fires in any window. A rule finding in the `setup` or `baseline` window is a false alarm and fails the campaign even when the observed window is scored correctly.

## Results

Artifacts are written under `evals/output/<timestamp>/`. Observation failures make a run incomplete instead of counting as model misses. The run stops at the first campaign that fails, and then writes no `summary.json`.

The runner uses the production detection service and investigator with a compact initial packet and a pinned graph view. It investigates each observed window inline, so production batching and sampling do not apply. Model-selected tool calls are uncapped, but every result stays bounded. `untruncated` means every matching fact in that pinned view fit within the query bounds. It does not claim that provider observation is complete, and truncated context cannot support promotion.

Each campaign report records the detector signals, the model's retrievals and assessment, the promotion decision, token usage, and model latency. The summary reports `securityRecall`, the share of attack campaigns that produced a promoted finding, and `benignSpecificity`, the share of benign campaigns that produced none, plus `securityPathRecall`, the share of attack campaigns whose observed window has an investigation-eligible signal on the observed path. A promoted finding is impossible without one. Model output is not deterministic, so expect some run-to-run variation.
