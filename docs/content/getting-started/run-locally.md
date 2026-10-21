---
title: Run locally
description: Start PostgreSQL, run the service against Kubernetes or AWS, and open the explorer.
weight: 2
---

## Requirements

- Go 1.27 or later
- Docker with Compose v2, for PostgreSQL. Development and CI use PostgreSQL 16, and other versions are untested.
- kind and kubectl, or any Kubernetes 1.30 or later cluster in your current kubectl context
- Node.js 24 with pnpm 11, only to build the web UI. Node.js 22.12 or later works. Go builds and tests need no Node toolchain.
- For AWS, credentials the default AWS SDK chain can find, with the read permissions listed in [AWS](../../plugins/aws/).

## Start it

Create a cluster, or skip this if your current kubectl context already points at one you want to inspect:

```sh
kind create cluster --name agentshield-demo
```

Then start PostgreSQL and the service:

```sh
git clone https://github.com/agentshield-dev/agentshield.git
cd agentshield
export POSTGRES_PASSWORD='development-only-password'
make postgres-up
export AGENTSHIELD_DATABASE_URL="postgres://agentshield:${POSTGRES_PASSWORD}@127.0.0.1:5432/agentshield?sslmode=disable"
make run
```

Open `http://127.0.0.1:8088`. Within a few seconds the explorer shows the cluster's namespaces, workloads, Pods, Services, ServiceAccounts, and Nodes, and the relationships between them. A fresh kind cluster has roughly 250 resources.

`make run` builds the web UI when its sources changed (pass `UI=0` to skip), applies database migrations, then starts `go run ./cmd/agentshield --listen 127.0.0.1:8088`. The service watches the cluster in your current Kubernetes context and publishes what it finds into the graph. Without a built UI the service still runs, and `/` reports that the UI is not built.

{{< callout title="Discovery reads. Remediation can write." >}}
Because `make run` listens on loopback with discovery on, live remediation is enabled with your kubectl credentials, and a fix you prepare and approve in the explorer is applied to the cluster. To only look, use a read-only kubectl context or pass `--kubernetes-kubeconfig` with read-only credentials. See the [security model](../../operations/security/).
{{< /callout >}}

Check the API:

```sh
curl -s http://127.0.0.1:8088/readyz -o /dev/null -w '%{http_code}\n'   # 204 once a graph is published
curl -s http://127.0.0.1:8088/api/v1/overview
```

Create or change something, for example `kubectl create deployment web --image=nginx`, and watch the graph update.

## Explore without live discovery

`make graph-ui` starts the service with `--disable-discovery`. It serves the state already stored in PostgreSQL and starts no Kubernetes or AWS discovery.

## Choose the Kubernetes cluster explicitly

```sh
go run ./cmd/agentshield \
  --kubernetes-kubeconfig /path/to/kubeconfig \
  --kubernetes-cluster-id my-cluster \
  --kubernetes-source-id kubernetes/my-cluster \
  --istio-cluster-id my-cluster --istio-source-id kubernetes/my-cluster \
  --agentgateway-cluster-id my-cluster --agentgateway-source-id kubernetes/my-cluster \
  --cilium-cluster-id my-cluster --cilium-source-id kubernetes/my-cluster \
  --falco-cluster-id my-cluster
```

Set `--kubernetes-cluster-id` to a stable identifier owned by your provider. It is the authority component of every Kubernetes resource identity, and identity is an authority plus an immutable key, so keep the value the same across restarts. Display names stay attributes.

Each plugin has its own cluster ID flag, and all of them must carry the same value for their assertions to land on the same objects. The Istio, agentgateway, and Cilium plugins also need the Kubernetes plugin's source ID, because a plugin can only consume collections published on its own source. The defaults, `local` and `kubernetes/local`, already match. The [configuration](../../operations/configuration/) page lists every flag.

## Run against AWS

Discovery needs at least one source. `--aws-region` turns the AWS plugin on and `--kubernetes-disable` turns the Kubernetes plugins off. To read only AWS, with `AGENTSHIELD_DATABASE_URL` still set:

```sh
AWS_PROFILE=example go run ./cmd/agentshield \
  --kubernetes-disable \
  --aws-region us-east-1
```

The plugin uses the default AWS credential chain and needs an explicit region. It reconciles at startup and every five minutes. Add `--aws-events-queue-url` to reconcile as soon as CloudTrail reports a change, and `--aws-firehose-stream-arn` to take in VPC Flow Logs. [AWS](../../plugins/aws/) lists the permissions and infrastructure each one needs.

Leave out `--kubernetes-disable` to read both. A Kubernetes Node whose `spec.providerID` names an EC2 instance in the plugin's account and region is then linked to that instance.

## The database

On start, the service applies embedded, checksum-verified schema migrations while holding a PostgreSQL advisory transaction lock. In production, create the database and role through your secret-management and provisioning systems, grant the role DDL rights while bootstrapping, then run the service.

Prefer `AGENTSHIELD_DATABASE_URL` from a secret manager. `--database-url` exists for local use but exposes credentials in the process list.

## Send telemetry

Telemetry is optional. Point an OpenTelemetry collector's OTLP/HTTP logs exporter at `http://127.0.0.1:8088/v1/logs`. Plugins that understand a log format map it into normalized events: [Istio](../../plugins/istio/) waypoint access logs and [Falco](../../plugins/falco/) shell alerts. AWS VPC Flow Logs skip the collector and arrive from Amazon Data Firehose. See [Telemetry](../../concepts/telemetry/) and [AWS](../../plugins/aws/).

## Clean up

```sh
make postgres-down                         # stops PostgreSQL; data stays in a Docker volume
make clean                                 # removes the local .agentshield/ directory
kind delete cluster --name agentshield-demo
```

`.agentshield/` holds the default telemetry file.

## Next

[Enable reasoning](../enable-reasoning/) to get findings.
