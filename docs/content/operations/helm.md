---
title: Deploy with Helm
description: Install agentshield on Kubernetes with the Helm chart, and what the chart does and does not set up.
weight: 2
---

The chart in `deploy/kubernetes` deploys one agentshield process with a read-only ClusterRole, a `ClusterIP` Service, health probes, and a local JSONL telemetry sink. PostgreSQL is required and comes from a Secret you create. Agentshield is pre-1.0 and no container image is published yet, so build one from the repository's `Dockerfile`.

Read the [security model](../security/) first. The HTTP API has no authentication.

## Install

Build and push the image to a registry your cluster can pull from:

```sh
docker build -t registry.example.com/agentshield:v0.1.0 .
docker push registry.example.com/agentshield:v0.1.0
```

Create a namespace with restricted Pod Security labels and a Secret that holds the database URL:

```sh
kubectl create namespace agentshield-system
kubectl label namespace agentshield-system \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest
kubectl -n agentshield-system create secret generic agentshield-database \
  --from-literal=url='postgres://agentshield:REDACTED@postgres.example.internal:5432/agentshield?sslmode=verify-full'
```

Install the chart with the image you built:

```sh
helm upgrade --install agentshield deploy/kubernetes \
  --namespace agentshield-system \
  --set image.repository=registry.example.com/agentshield \
  --set image.tag=v0.1.0
kubectl -n agentshield-system rollout status deployment/agentshield-agentshield
```

## Cluster IDs

The defaults use the stable ID `example-cluster` for the Kubernetes, Istio, agentgateway, Cilium, and Falco plugins. Override each with `--set discovery.<plugin>.clusterID=...`. Plugins whose assertions refer to the same Kubernetes objects need the same cluster ID. The Kubernetes-backed plugins also need the same source ID as the Kubernetes plugin, because a plugin can only consume collections published on its own source. Do not change an authority ID for a database that already holds graph data.

## PostgreSQL

Use a dedicated database for each agentshield process. PostgreSQL 16 is used in development and CI, and other versions are untested. Provision the database and role before installing the chart, and store the connection URL in the Secret named by `database.existingSecret`, under the key `database.secretKey` (`url` by default). Use TLS outside loopback.

The role needs DDL rights at startup to apply pending migrations. Change-feed and contribution history have no retention policy yet.

## Telemetry storage

The default raw sink is the file `/var/lib/agentshield/telemetry.jsonl` on a size-limited `emptyDir`. It is lost when the Pod is replaced. For durable local storage, customize the Deployment with a PersistentVolumeClaim. The chart does not provision one, because storage classes and retention requirements vary.

ClickHouse is opt-in. Create the schema from `deploy/clickhouse/schema.sql`, create a Secret with the password, then enable the sink:

```sh
helm upgrade --install agentshield deploy/kubernetes \
  --namespace agentshield-system \
  --set image.repository=registry.example.com/agentshield \
  --set image.tag=v0.1.0 \
  --set telemetry.clickhouse.enabled=true \
  --set telemetry.clickhouse.url=http://clickhouse.example.internal:8123 \
  --set telemetry.clickhouse.existingSecret=agentshield-clickhouse
```

The Secret key defaults to `password`. Set `telemetry.clickhouse.secretKey` to use another key. No database URL or password belongs in Helm values or source control. If ClickHouse is unavailable, ingestion applies backpressure instead of dropping events.

## AWS

Set `discovery.aws.region` to turn on the AWS plugin. `discovery.aws.eventsQueueURL` adds CloudTrail change events, and `discovery.aws.firehoseStreamARN` turns on VPC Flow Log ingestion, with the delivery stream's access key read from the Secret named by `discovery.aws.firehoseExistingSecret`. See [AWS](../../plugins/aws/).

## Models

The chart passes `--model-endpoint` and `--model-provider` when `model.endpoint` is set, and reads the API key from the Secret named by `model.existingSecret` into `AGENTSHIELD_MODEL_API_KEY`. It has no values for `--agentic-investigation` or `--deployment-rule-authoring`, and setting the endpoint alone enables nothing. See [Enable reasoning](../../getting-started/enable-reasoning/).

## One process per database

Run one agentshield process per database and leave `replicaCount` at `1`. One process discovers one Kubernetes cluster and one AWS region. Several replicas would duplicate provider rollups and share the default detection consumer ID. Prepared remediations, the collection hub, and telemetry rollups live in process memory and are not shared. Only migrations and the Deployment rule author's queue leases coordinate across processes.

The chart checks `/healthz` for liveness and `/readyz` for database connectivity and a published graph. The process logs to stderr.

## Access

The Pod listens on `0.0.0.0:8088` so kubelet probes and the Service can reach it. The Service is cluster-internal, but the chart installs no NetworkPolicy, so supply your own network controls to restrict who can reach the unauthenticated API. Use `kubectl port-forward` for local access:

```sh
kubectl -n agentshield-system port-forward service/agentshield-agentshield 8088:8088
```

Do not add an Ingress, LoadBalancer, or NodePort without an authenticating and authorizing proxy. The path from an OpenTelemetry collector to agentshield is unauthenticated too.

The ClusterRole includes Secrets, because Kubernetes RBAC cannot grant metadata-only Secret watches. The plugin discards values before persistence, but its service account can read every Secret in the cluster. The ClusterRole grants no write permissions, and live remediation stays off on this non-loopback listener. The rule review and regenerate routes return `503` as well.
