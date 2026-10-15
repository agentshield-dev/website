---
title: Run locally
description: Start PostgreSQL, run the service against Kubernetes or AWS, and open the explorer.
weight: 1
---

## Requirements

- Go 1.27 or later
- PostgreSQL 14 or later. The repository's development setup and integration tests use PostgreSQL 16 in Docker.
- Docker, kind, kubectl, jq, curl, and Bash
- Node.js 24 with pnpm, only to build the web UI. Go builds and tests need no Node toolchain.
- For AWS, credentials the default AWS SDK chain can find, with the read permissions listed in [AWS](../../plugins/aws/).

## Start it

```sh
git clone https://github.com/solo-io/agentshield.git
cd agentshield
export POSTGRES_PASSWORD='development-only-password'
make postgres-up
export AGENTSHIELD_DATABASE_URL="postgres://agentshield:${POSTGRES_PASSWORD}@127.0.0.1:5432/agentshield?sslmode=disable"
make run
```

Open `http://127.0.0.1:8088`.

`make run` rebuilds the web UI when its sources changed (pass `UI=0` to skip), then starts `go run ./cmd/agentshield --listen 127.0.0.1:8088`. The service watches the cluster in your current Kubernetes context and publishes what it finds into the graph.

Without a built UI the service still runs, and `/` reports that the UI is not built.

## Explore without live discovery

`make graph-ui` starts the service with `--disable-discovery`. It serves the state already stored in PostgreSQL and starts no Kubernetes or AWS discovery.

## Choose the Kubernetes cluster explicitly

```sh
go run ./cmd/agentshield \
  --kubeconfig /path/to/kubeconfig \
  --cluster-id stable-cluster-id \
  --source-id kubernetes/stable-cluster-id
```

Set `--cluster-id` to a stable identifier owned by your provider. It is the authority component of every Kubernetes resource identity, and identity is an authority plus an immutable key, so keep the value the same across restarts. Display names stay attributes.

## Run against AWS

Discovery needs at least one source. `--aws-region` turns the AWS plugin on and `--disable-kubernetes` turns the Kubernetes plugins off. To read only AWS, with `AGENTSHIELD_DATABASE_URL` still set:

```sh
AWS_PROFILE=example go run ./cmd/agentshield \
  --disable-kubernetes \
  --aws-region us-east-1
```

The plugin uses the default AWS credential chain and needs an explicit region. It reconciles at startup and every five minutes. Add `--aws-events-queue-url` to reconcile as soon as CloudTrail reports a change, and `--aws-firehose-stream-arn` to take in VPC Flow Logs. [AWS](../../plugins/aws/) lists the permissions and infrastructure each one needs.

Leave out `--disable-kubernetes` to read both. A Kubernetes Node whose `spec.providerID` names an EC2 instance in the plugin's account and region is then linked to that instance.

## The database

On start, the service applies embedded, checksum-verified schema migrations while holding a PostgreSQL advisory transaction lock. In production, create the database and role through your secret-management and provisioning systems, grant the role DDL rights while bootstrapping, then run the service.

Prefer `AGENTSHIELD_DATABASE_URL` from a secret manager. `--database-url` exists for local use but exposes credentials in the process list.

## Send telemetry

Telemetry is optional. Point an OpenTelemetry collector's OTLP/HTTP logs exporter at `http://127.0.0.1:8088/v1/logs`. Plugins that understand a log format map it into normalized events. AWS VPC Flow Logs skip the collector and arrive from Amazon Data Firehose. See [Telemetry](../../concepts/telemetry/) and [AWS](../../plugins/aws/).

## Clean up

```sh
make postgres-down
make clean
```

`make clean` removes the local `.agentshield/` directory, which holds the default telemetry file.

## Next

[Enable reasoning](../enable-reasoning/) to get findings.
