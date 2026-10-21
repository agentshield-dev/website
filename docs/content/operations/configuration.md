---
title: Configuration
description: Every flag and environment variable of the service, with defaults.
weight: 1
---

The binary is `agentshield`. Only the database URL is required. Flags accept `-flag` or `--flag`, and when a flag's default comes from an environment variable, an explicit flag wins. Every binary prints its version and commit and exits with `--version`.

## Server

| Flag | Environment variable | Default | Meaning |
| --- | --- | --- | --- |
| `--listen` | none | `127.0.0.1:8088` | HTTP listen address. The API has no authentication, so a non-loopback address exposes it to anyone who can reach the port and turns off live remediation. |
| `--disable-discovery` | none | `false` | Serve persisted state without starting Kubernetes or AWS discovery. Also turns off live remediation. |
| `--version` | none | none | Print the version and commit, then exit. |

## Database

| Flag | Environment variable | Default | Meaning |
| --- | --- | --- | --- |
| `--database-url` | `AGENTSHIELD_DATABASE_URL` | none | PostgreSQL connection URL. Required. Prefer the variable; the flag shows up in the process list. |
| `--database-max-conns` | `AGENTSHIELD_DATABASE_MAX_CONNS` | `20` | Maximum pool connections. |
| `--database-min-conns` | `AGENTSHIELD_DATABASE_MIN_CONNS` | `2` | Minimum pool connections. |

## Kubernetes discovery

Kubernetes discovery is on by default. Each plugin registers its own prefixed flags. The Istio, agentgateway, Cilium, and Falco plugins each have a cluster ID, and all of them should carry the same value as the Kubernetes plugin's so their assertions land on the same objects. The Istio, agentgateway, and Cilium plugins also need the Kubernetes plugin's source ID, because a plugin can only consume collections published on its own source.

| Flag | Default | Meaning |
| --- | --- | --- |
| `--kubernetes-disable` | `false` | Leave the Kubernetes plugins out. Discovery then needs `--aws-region`. |
| `--kubernetes-kubeconfig` | standard loading rules | Path to a kubeconfig. In a cluster, the in-cluster configuration is used. |
| `--kubernetes-cluster-id` | `local` | Stable authority ID for Kubernetes resource identities. Never change it for an existing cluster. |
| `--kubernetes-network-id` | the cluster ID | Stable authority ID for the network realm. |
| `--kubernetes-source-id` | `kubernetes/local` | Stable ID of the Kubernetes source. |
| `--istio-cluster-id` | `local` | Stable cluster authority used by Istio. |
| `--istio-network-id` | the Istio cluster ID | Network realm used by Istio. |
| `--istio-source-id` | `kubernetes/local` | Stable source ID for Istio contributions and telemetry. |
| `--istio-root-namespace` | `istio-system` | The Istio mesh root namespace. |
| `--agentgateway-cluster-id` | `local` | Stable cluster authority used by agentgateway. |
| `--agentgateway-source-id` | `kubernetes/local` | Stable source ID for agentgateway contributions. |
| `--cilium-cluster-id` | `local` | Stable cluster authority used by Cilium. |
| `--cilium-source-id` | `kubernetes/local` | Stable source ID for Cilium contributions. |
| `--falco-cluster-id` | `local` | Stable cluster authority used by Falco alert telemetry. |
| `--falco-source-id` | `kubernetes/local` | Stable source ID for Falco telemetry. |

## AWS discovery

AWS discovery is off until you set a region. Credentials come from the default AWS SDK chain, for example `AWS_PROFILE`.

| Flag | Environment variable | Default | Meaning |
| --- | --- | --- | --- |
| `--aws-region` | none | empty | Turns on EC2 discovery in this region. |
| `--aws-events-queue-url` | none | empty | SQS queue that receives CloudTrail events through EventBridge. Optional. |
| `--aws-firehose-stream-arn` | none | empty | Turns on VPC Flow Log ingestion from this Firehose delivery stream. Needs AWS discovery. |
| `--aws-firehose-access-key` | `AGENTSHIELD_AWS_FIREHOSE_ACCESS_KEY` | none | Access key of that delivery stream. Required with `--aws-firehose-stream-arn`. Prefer the variable. |

With discovery on, at least one source must be enabled. The service stops at startup if Kubernetes is disabled and no region is set, and if an events queue or Firehose option is set without a region. See [AWS](../../plugins/aws/).

## Telemetry storage

| Flag | Environment variable | Default | Meaning |
| --- | --- | --- | --- |
| `--telemetry-jsonl` | none | `.agentshield/telemetry.jsonl` | Local durable telemetry file. |
| `--clickhouse-url` | none | empty | ClickHouse HTTP endpoint. JSONL is used when empty. |
| `--clickhouse-database` | none | `agentshield` | ClickHouse database. |
| `--clickhouse-table` | none | `telemetry_events` | ClickHouse raw telemetry table. |
| `--clickhouse-username` | none | `default` | ClickHouse username. |
| none | `AGENTSHIELD_CLICKHOUSE_PASSWORD` | none | ClickHouse password. |

## Model features

Nothing calls a model unless one of the two feature flags below is set. Detection runs when either is on and makes no model calls itself. There is no detection-only mode. See [Enable reasoning](../../getting-started/enable-reasoning/).

| Flag | Environment variable | Default | Meaning |
| --- | --- | --- | --- |
| `--agentic-investigation` | `AGENTSHIELD_AGENTIC_INVESTIGATION` | `false` | Investigate built-in novelty signals with a model agent that can promote findings, from a sampled queue. Needs an OpenAI Responses-compatible endpoint, and is rejected with `--model-provider=anthropic`. |
| `--deployment-rule-authoring` | `AGENTSHIELD_DEPLOYMENT_RULE_AUTHORING` | `false` | Draft detection rules for each Kubernetes Deployment Pod template revision with a model agent. Drafts run in shadow mode until approved. Needs an endpoint, or `--model-provider=anthropic`. |

### Model

| Flag | Environment variable | Default | Meaning |
| --- | --- | --- | --- |
| `--model-endpoint` | `AGENTSHIELD_MODEL_ENDPOINT` | empty | Model API base URL. Required for OpenAI. Anthropic defaults it. Setting it alone enables nothing. |
| `--model-api-key` | `AGENTSHIELD_MODEL_API_KEY` | see below | Model API key. Prefer the environment. |
| `--model-provider` | none | `openai` | `openai` or `anthropic`. Anthropic uses the Messages API, defaults the endpoint to `https://api.anthropic.com`, and supports only rule authoring. |
| `--model` | `AGENTSHIELD_MODEL` | `gpt-6-astra` | Model name. With Anthropic and no override, the author uses its provider default. |
| `--model-reasoning-effort` | `AGENTSHIELD_MODEL_REASONING_EFFORT` | empty | Reasoning effort for compatible providers, for both features. Empty sends none. |

API key lookup order: `--model-api-key`, then `AGENTSHIELD_MODEL_API_KEY`, then the conventional key for the selected provider, `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. With no key, no credentials are sent.

### Detection

| Flag | Environment variable | Default | Meaning |
| --- | --- | --- | --- |
| `--detection-interval` | none | `1s` | Change-feed polling interval. |
| `--detection-consumer` | none | `reasoning/default` | Durable consumer ID for the change-feed cursor. |
| `--detection-signal-retention` | none | `168h` | How long recorded signals and finished investigation jobs are kept. Minimum `1h`. |
| `--detector-reload-interval` | none | `10s` | Polling interval for the active CEL ruleset and Deployment rules. Must be positive. |

### Agentic investigation

| Flag | Environment variable | Default | Meaning |
| --- | --- | --- | --- |
| `--agentic-investigation-retrieval` | `AGENTSHIELD_AGENTIC_INVESTIGATION_RETRIEVAL` | `model_selected` | `model_selected` or `deterministic`. |
| `--agentic-investigation-batch-window` | none | `30s` | How long a queued investigation waits so later windows that share a resource join it. `0` to `10m`. |
| `--agentic-investigation-sample-rate` | none | `1` | Fraction of medium-risk investigations run, `0` to `1`. High and critical always run. |
| `--agentic-investigation-dedup-window` | none | `1h` | Skip an investigation whose signal pattern was already investigated within this window. `0` disables. |
| `--agentic-investigation-max-per-hour` | none | `0`, unlimited | Investigations started in any trailing hour. Over budget, medium-risk jobs are skipped and high-risk jobs wait. |
| `--agentic-investigation-max-attempts` | none | `5` | Failed attempts before a job fails permanently. |
| `--agentic-investigation-poll-interval` | none | `1s` | Investigation queue polling interval. |

### Deployment rule authoring

| Flag | Environment variable | Default | Meaning |
| --- | --- | --- | --- |
| `--deployment-rule-baseline-window` | none | `6h` | How long a new Deployment or Pod template revision is observed before its rule is drafted. `0` to `24h`, the telemetry retention. |
| `--deployment-rule-authoring-poll-interval` | none | `1s` | Rule-authoring queue polling interval. Must be positive. |
| `--deployment-rule-authoring-timeout` | none | `5m` | Maximum duration of one rule-authoring model call. Minimum `30s`. |
| `--rule-review-api` | `AGENTSHIELD_RULE_REVIEW_API` | `false` | Serve the unauthenticated rule review and regenerate routes on a non-loopback listener. They always work on a loopback listener. Set it only behind an authenticating proxy or in a disposable environment. |

## Other binaries

`agentshield rules <validate|save|activate|show|jobs|job|review|workload-rules|signals|investigations>` manages CEL rulesets, reviews Deployment rules, and inspects signals and queues. The `agentshield-detector-rules` binary is a compatibility entry point with the same implementation. See [Detection rules](../../concepts/rules/#manage-rulesets).

| Flag | Default | Used by | Meaning |
| --- | --- | --- | --- |
| `--file` | empty | `validate`, `save` | Ruleset JSON file. |
| `--id` | empty | `activate`, `show` | Ruleset ID. Required for `activate`. |
| `--actor` | empty | `save`, `activate`, `review` | Audit name, required for those actions. Not authentication. |
| `--expected-revision` | `0` | `activate` | Current activation revision. `0` means none is active. |
| `--job-id` | `0` | `job`, `review` | Deployment rule-authoring job ID. |
| `--decision` | empty | `review` | `approved` runs the job's rule in active mode. `rejected` stops loading it. |
| `--rule-id` | empty | `signals` | Only signals from this rule. |
| `--investigation` | empty | `signals` | Only signals in this state: `rule_finding`, `shadow`, `queued`, `below_threshold`, `disabled`, or `investigated`. |
| `--limit` | `100` | `signals`, `investigations` | Maximum rows, newest first. |
| `--database-url` | `AGENTSHIELD_DATABASE_URL` | all except `validate` | PostgreSQL URL. |

`agentshield-deployment-author` runs the rule author once against a local JSON file, with no database. It takes `--input`, `--model-endpoint`, `--model-api-key`, `--model`, `--model-provider`, `--timeout` (5 minutes), `--dry-run` to print the first request without sending it, and `--verbose`.

`agentshield-reasoning-mcp` serves the six investigation tools over streamable HTTP at `/mcp` for a saved packet, with no database or model. It takes `--packet`, an optional `--telemetry-context`, and `--listen` (default `127.0.0.1:8090`). It has no authentication, so change the listener only behind authenticated infrastructure.

## Build

| Variable | Default | Meaning |
| --- | --- | --- |
| `UI` | `1` | `UI=0` skips the web UI build in `make build`, `make run`, and `make graph-ui`. The default rebuilds the UI when its sources changed. |
| `LISTEN` | `127.0.0.1:8088` | The `--listen` value for `make run` and `make graph-ui`. |
| `DEMO_PORT` | `5173` | Port of the browser-only playground started by `make demo`. |

## Logs

Each long-running loop logs what it is doing at Info level, without a line per iteration. A status line reports a loop's counters at most every 15 seconds while it works and once a minute while idle.

| Loop | Status line |
| --- | --- |
| Discovery plugin | `discovery plugin` |
| Telemetry pipeline | `telemetry pipeline` |
| Detection service | `detection service` |
| Deployment rule authoring | `Deployment rule authoring worker` |
| Agentic investigation | `investigation worker` |

A rule draft that stays queued is usually inside its baseline window. The authoring status line shows `waiting_for_baseline` and `next_baseline_ends_in`.
