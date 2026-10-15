---
title: Security model
description: What is authenticated, what is loopback-only, what lives in memory, and the limits to know before you deploy.
weight: 2
---

Agentshield is v0. It is built for development and evaluation, and several production concerns are not covered yet.

## Authentication

The development API has no production authentication or authorization contract. The default listener is `127.0.0.1:8088`. Keep it on loopback, or put it behind an authenticated gateway you operate.

The path from an OpenTelemetry collector to `POST /v1/logs` is also a trust boundary with no authentication. Bind it to loopback or place it behind a gateway.

## Mutations

- Remediation candidates, prepare, and approve answer only when discovery is live and the listener is loopback. On any other setup, findings and graph data stay readable and nothing can be changed.
- Reasoning never applies a fix. A person approves each one.
- Prepared actions and approvals live in process memory. After a restart, prepare again.

A production deployment needs authentication, a durable approval audit, CSRF protection, cleanup, and coordination. None of these exist yet.

## AWS

- The plugin uses the default AWS credential chain, needs only read access to EC2, and never logs credentials. With an event queue it also needs to receive and delete messages on that queue.
- It does not change your AWS resources. It has no remediation actions, and its only writes are message deletions on the event queue.
- `POST /v1/aws/firehose/vpc-flow-logs` checks the delivery stream ARN and the access key in `AGENTSHIELD_AWS_FIREHOSE_ACCESS_KEY`. Firehose delivers only over HTTPS on port 443, so put a load balancer or gateway in front of the service that exposes only this route.
- The receiver acknowledges a batch once the in-process queue accepts it, before the sink commits it, and it does not deduplicate retries. Set Firehose's retry duration and S3 error backup accordingly.

## What the model sees

The model receives a compact packet of resource IDs, kinds, typed security semantics, opaque evidence handles, and signals. It does not receive raw telemetry or provider-native configuration. It queries the graph through six read-only tools, each bounded.

The service sends no credentials to the model endpoint. Point it at a gateway or proxy that attaches them.

## What is kept out of the graph

- Kubernetes Secrets arrive as object metadata and a sorted list of key names. Values, type, and annotations are excluded from collection payloads and from the native-event store.
- Istio ServiceEntry endpoint values stay out. Only counts and address classes are kept.
- Telemetry is stored raw outside the graph. The graph holds bounded rollups and evidence IDs.

## Verification

Verification proves that the declared policy and label are present. It does not prove the controller accepted them, that the datapath rolled out, or that traffic is blocked. See [Remediation](../../concepts/remediation/).

## Known limits

- On first start, or after a restart that lags, reasoning rebases to the current state instead of analyzing what changed while it was down.
- Detection works on batches of graph changes, so it is near real time, not instant.
- Publishing takes a global PostgreSQL advisory lock while it replaces a projection. Incremental, per-contribution maintenance is planned.
- Streaming APIs, coordinated consumer groups, retention, and historical replay are deferred.
- The Hubble Relay and agentgateway access-log transports are not provided yet.
- Cilium L7 policy, cross-namespace agentgateway backends, and a GatewayClass watch are not covered.
- The AWS plugin reads EC2 instances, network interfaces, and security groups in one region. It does not read routing, gateways, network ACLs, or IAM, so a public address or an open rule is not treated as proof of exposure.
