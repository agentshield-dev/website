---
title: Telemetry
description: How logs enter, where raw events are stored, and how bounded rollups reach the graph.
weight: 3
---

The graph says what exists and what is allowed. Telemetry says what is happening. They meet at one identity.

## Ingest

Send OTLP logs to `POST /v1/logs`. The endpoint accepts protobuf and JSON bodies, optionally gzip-compressed, up to 16 MiB per request. Add an OTLP/HTTP exporter to an existing collector logs pipeline, so your current exporters stay authoritative for your own telemetry retention:

```yaml
exporters:
  otlp_http/agentshield:
    endpoint: http://127.0.0.1:8088
    encoding: proto
    compression: gzip

service:
  pipelines:
    logs:
      exporters: [existing_backend, otlp_http/agentshield]
```

A plugin that understands a log format registers a mapper that turns each record into one or more normalized events. Exactly one mapper must match a record. A record with no match, an ambiguous match, or a mapping failure is rejected through OTLP partial success, and valid records in the same request proceed. The plugin and source of an event come from the mapper's registration, never from the payload.

| Plugin | Maps |
| --- | --- |
| Istio | Waypoint OTLP access logs, as `active-probe` events. See [Istio](../../plugins/istio/#telemetry). |
| Falco | Interactive-shell alerts, as `process-exec` events, delivered as OTLP logs with `service.name=falco`. See [Falco](../../plugins/falco/). |
| AWS | VPC Flow Logs delivered by Amazon Data Firehose, not OTLP, as `network-flow` events |
| Cilium | Hubble network flows have a normalizer, but no transport feeds it yet |
| agentgateway | Access logs have a normalizer, but no transport feeds it yet |

The Hubble Relay and agentgateway access-log transports are not provided yet. Resumable cursors for them are future work.

### Provider-native receivers

A plugin may own a narrowly scoped receiver for its provider's native format when that removes infrastructure without weakening identity, validation, or backpressure. The receiver authenticates the provider, validates the configured source independently of payload fields, bounds and decodes the native envelope, and normalizes straight into the same pipeline. The AWS plugin's VPC Flow Log receiver at `POST /v1/aws/firehose/vpc-flow-logs` is the first. See [AWS](../../plugins/aws/).

## Normalized events

| Field | Meaning |
| --- | --- |
| `eventId` | Stable identity of the source event |
| `observedAt` | When the action happened, never when it was published |
| `kind` | Event class: `network-flow`, `gateway-request`, `active-probe`, or `process-exec` |
| `subject`, `object` | Complete authority-qualified identities |
| `operation`, `outcome` | A bounded action and a mapper-defined result |
| `coverage` | The boundary of what was observed |
| `count` | Number of occurrences. Defaults to 1. |
| `properties` | Up to 32 string entries, with keys up to 128 bytes and values up to 512 bytes. No secrets. |
| `evidenceIds` | Durable pointers. Defaults to the event ID. |

Direction runs from subject to object regardless of which proxy, collector, or adapter saw the event.

## Storage

Raw events are stored before anything is projected into the graph.

- **JSONL** is the default, at `.agentshield/telemetry.jsonl` (`--telemetry-jsonl`).
- **ClickHouse** is used when `--clickhouse-url` is set. The schema in `deploy/clickhouse/schema.sql` defines a raw `telemetry_events` table with daily partitions and a 30-day TTL, and a one-minute rollup view with a 180-day TTL. Set the password in `AGENTSHIELD_CLICKHOUSE_PASSWORD`.

## Rollups in the graph

The graph holds bounded rollups and evidence IDs, not payloads.

- Events are grouped into one-minute series by plugin, source, subject, object, kind, operation, outcome, and coverage.
- Series are kept for 24 hours, with at most 100,000 series. The oldest are evicted first.
- Exact network endpoints resolve against current inventory first. A peer that does not resolve collapses into a closed, direction-aware peer class, because the graph never uses an unmatched exact address as an identity.
- Each rollup becomes a telemetry assertion. A `communicates-with` relationship acts as a lease: it refreshes while traffic continues and retracts when it stops. A `process-exec` series gets the same kind of lease as an `executes` relationship from the Pod to a bounded process class, so a process execution never implies network reachability.

Telemetry-only updates do not write to the change feed, so steady traffic stays quiet. A lease is different. Its creation, its refresh near expiry, and its retraction are semantic changes and do reach the change feed, so a new edge can wake detection. The investigator reaches the telemetry itself through its tools.

## Backpressure

The API queue holds up to 100,000 events by default. When it is full, producers block. Batches retry with exponential backoff from 100 ms to 10 s, and nothing reaches the graph before its storage batch succeeds. On shutdown, queued batches get a 10-second deadline.

## Trust boundary

The path from a collector to the service has no production authentication. Bind the listener to loopback, or place it behind an authenticated gateway. The AWS Firehose route is the exception: it checks the delivery stream ARN and an access key, and still belongs behind HTTPS. See [AWS](../../plugins/aws/).

For the full schema, see the [telemetry reference](/docs/architecture/telemetry/).
