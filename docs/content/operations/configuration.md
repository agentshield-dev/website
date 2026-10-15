---
title: Configuration
description: Every flag and environment variable of the service, with defaults.
weight: 1
---

The binary is `agentshield`. Only the database URL is required.

## Server

| Flag | Environment variable | Default | Meaning |
| --- | --- | --- | --- |
| `--listen` | none | `127.0.0.1:8088` | HTTP listen address. Remediation endpoints answer only on a loopback address. |
| `--disable-discovery` | none | `false` | Serve persisted state without starting Kubernetes or AWS discovery. |

## Database

| Flag | Environment variable | Default | Meaning |
| --- | --- | --- | --- |
| `--database-url` | `AGENTSHIELD_DATABASE_URL` | none | PostgreSQL connection URL. Required. Prefer the variable; the flag shows up in the process list. |
| `--database-max-conns` | `AGENTSHIELD_DATABASE_MAX_CONNS` | `20` | Maximum pool connections. |
| `--database-min-conns` | `AGENTSHIELD_DATABASE_MIN_CONNS` | `2` | Minimum pool connections. |

## Kubernetes discovery

Kubernetes discovery is on by default.

| Flag | Default | Meaning |
| --- | --- | --- |
| `--disable-kubernetes` | `false` | Leave the Kubernetes plugins out. Discovery then needs `--aws-region`. |
| `--kubeconfig` | standard loading rules | Path to a kubeconfig. In a cluster, the in-cluster configuration is used. |
| `--cluster-id` | `local` | Stable authority ID for Kubernetes resource identities. |
| `--network-id` | the cluster ID | Stable authority ID for the network realm. |
| `--source-id` | `kubernetes/local` | Stable ID of this discovery source. |
| `--istio-root-namespace` | `istio-system` | The Istio mesh root namespace. |

## AWS discovery

AWS discovery is off until you set a region. Credentials come from the default AWS SDK chain, for example `AWS_PROFILE`.

| Flag | Environment variable | Default | Meaning |
| --- | --- | --- | --- |
| `--aws-region` | none | empty | Turns on EC2 discovery in this region. |
| `--aws-events-queue-url` | none | empty | SQS queue that receives CloudTrail events through EventBridge. Optional. |
| `--aws-firehose-stream-arn` | none | empty | Turns on VPC Flow Log ingestion from this Firehose delivery stream. Needs AWS discovery. |
| none | `AGENTSHIELD_AWS_FIREHOSE_ACCESS_KEY` | none | Access key of that delivery stream. Required with `--aws-firehose-stream-arn`. |

With discovery on, at least one source must be enabled. The service stops at startup if Kubernetes is disabled and no region is set. See [AWS](../../plugins/aws/).

## Telemetry storage

| Flag | Environment variable | Default | Meaning |
| --- | --- | --- | --- |
| `--telemetry-jsonl` | none | `.agentshield/telemetry.jsonl` | Local durable telemetry file. |
| `--clickhouse-url` | none | empty | ClickHouse HTTP endpoint. JSONL is used when empty. |
| `--clickhouse-database` | none | `agentshield` | ClickHouse database. |
| `--clickhouse-table` | none | `telemetry_events` | ClickHouse raw telemetry table. |
| `--clickhouse-username` | none | `default` | ClickHouse username. |
| none | `AGENTSHIELD_CLICKHOUSE_PASSWORD` | none | ClickHouse password. |

## Reasoning

| Flag | Environment variable | Default | Meaning |
| --- | --- | --- | --- |
| `--model-endpoint` | `AGENTSHIELD_MODEL_ENDPOINT` | empty | OpenAI-compatible endpoint. Empty turns reasoning off. |
| `--model` | `AGENTSHIELD_MODEL` | `gpt-6-astra` | Model name. |
| `--reasoning-effort` | `AGENTSHIELD_REASONING_EFFORT` | empty | Reasoning effort for the Responses API. |
| `--reasoning-retrieval` | `AGENTSHIELD_RETRIEVAL_MODE` | `model_selected` | `model_selected` or `deterministic`. |
| `--reasoning-consumer` | none | `reasoning/default` | Stable ID of the durable reasoning consumer. |
| `--reasoning-interval` | none | `1s` | How often reasoning polls for graph changes. |

## Build

`UI=0` skips the web UI build in `make build`, `make run`, and `make graph-ui`. The default rebuilds the UI when its sources changed.
