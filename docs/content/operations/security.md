---
title: Security model
description: What is authenticated, what is loopback-only, what lives in memory, and the limits to know before you deploy.
weight: 3
---

Agentshield is pre-1.0. It is built for development and evaluation, and several production concerns are not covered yet.

## The HTTP API has no authentication

Every route on `--listen` is unauthenticated and has no authorization: the graph, findings, the OTLP and Firehose receivers, the explorer, and remediation. Anyone who can reach the port can:

- read the full graph, including resource names, labels, relationships, and evidence IDs;
- read findings;
- send telemetry that the registered mappers accept;
- prepare and approve remediations, if live remediation is on;
- approve or reject Deployment rule drafts and request new ones, which calls the configured model, if rule review is on.

Defaults that limit this:

- `--listen` defaults to `127.0.0.1:8088`.
- Live remediation is registered only when discovery is running and the listener is a loopback address. On any other address the remediation endpoints return `503`.
- The rule review and regenerate routes act only on a loopback listener, or when `--rule-review-api` is set. On any other address they return `503`.
- The Firehose receiver exists only when `--aws-firehose-stream-arn` is set, and it checks the stream ARN, access key, protocol version, and request ID on every request.

If you bind to a non-loopback address, put agentshield behind infrastructure that authenticates and authorizes every request, such as an authenticating reverse proxy, a service mesh with mutual TLS and authorization policy, or a private network with strict access control. The explorer sends no credentials of its own and expects same-origin requests.

## Browser requests

Two checks stop a website open in your browser from using a loopback agentshield on your behalf.

- **JSON content type.** Every `POST` route rejects requests that are not `application/json`. The OTLP receiver also accepts `application/x-protobuf`. A page on another origin cannot send those types without a CORS preflight, and agentshield never approves a preflight.
- **Host check.** On a loopback listener the server rejects any request whose `Host` header is not `localhost` or a loopback IP. This blocks DNS rebinding, where a hostile page points its own domain at `127.0.0.1` to become same-origin. The Firehose route sits in front of this check and relies on its access key instead.

These are not authentication and not a complete CSRF policy. They do not stop a process or user on the same machine from calling the API directly, anyone who can reach a non-loopback listener, or a cross-site `GET`, which a page can trigger but cannot read.

## Mutations

- Remediation candidates, prepare, and approve answer only when discovery is live and the listener is loopback. On any other setup, findings and graph data stay readable and nothing can be changed.
- Detection, rules, and investigation never apply a fix. A person approves each one.
- Prepared actions and approvals live in process memory. There is no durable approval record and no user identity. After a restart, prepare again.
- A rule review decision is recorded with an actor name that is audit metadata, not an identity. Enforce the split between rule authors and approvers through database roles.
- The Kubernetes credentials of the process decide what it can change. Grant read-only RBAC unless you need remediation. Locally, `make run` uses your current kubectl context, so an approved remediation can do anything you can. Use a read-only context or `--kubernetes-kubeconfig` if you only want to look.

A production deployment needs authentication, a durable approval audit, CSRF protection, cleanup, and coordination. None of these exist yet.

## AWS

- The plugin uses the default AWS credential chain, needs only read access to EC2, and never logs credentials. With an event queue it also needs to receive and delete messages on that queue.
- It does not change your AWS resources. It has no remediation actions, and its only writes are message deletions on the event queue.
- `POST /v1/aws/firehose/vpc-flow-logs` checks the delivery stream ARN and the access key in `AGENTSHIELD_AWS_FIREHOSE_ACCESS_KEY`. Firehose delivers only over HTTPS on port 443, so put a load balancer or gateway in front of the service that exposes only this route.
- The receiver acknowledges a batch once the in-process queue accepts it, before the sink commits it, and it does not deduplicate retries. Set Firehose's retry duration and S3 error backup accordingly.

## What the model sees

Agentshield calls the model endpoint only for the features you enable. Setting `--model-endpoint` alone sends nothing, and running detection rules never calls a model.

- **Agentic investigation** sends graph data: resource IDs, kinds, `network/role`, security semantics, relationships, facets, evidence IDs, and the tool results the model requests. It never sends raw telemetry or provider-native configuration.
- **Deployment rule authoring** sends, for each Deployment Pod template revision, the Deployment's name, namespace, and service account, plus a summary of its observed outbound requests: destination names and roles, request methods and paths, outcomes, and counts. Query strings are removed, and numeric, UUID, and long hex path segments are replaced with `{id}`. Paths can still contain other identifiers, such as names or emails.

Prompts treat these values as untrusted data. Use a model endpoint approved for this data and keep API keys in environment variables. Responses API requests use `store=false`. The service sends the configured API key as a bearer token, or as an `x-api-key` header for Anthropic, and sends no credentials when no key is set, so you can point it at a gateway or proxy that attaches them.

## Telemetry and evidence are sensitive

- Telemetry properties, evidence, and raw sink contents can reveal internal topology, request paths, and addresses. Treat the JSONL file and the ClickHouse tables as sensitive data.
- Mappers must not put credentials, tokens, authorization headers, request bodies, or principal names into normalized properties. The Falco mapper never copies command lines or user names, and the agentgateway normalizer records only that a request was authenticated.
- The OTLP receiver never logs record content. Rejection responses contain only counts.
- The plugin and source of an event come from mapper registration, never from the payload. Anyone who can send records that match a mapper can still inject plausible telemetry, so restrict who can write to your collector and to agentshield.
- Both HTTP receivers acknowledge before the raw sink write. They answer as soon as the events are in the in-memory queue, up to 100,000 events. Events still queued are lost if the process crashes or if the 10-second shutdown drain runs out, and the sender does not retry them.

## Reasoning MCP server

`agentshield-reasoning-mcp` serves packet-backed graph and telemetry tools over streamable HTTP at `/mcp`, on `127.0.0.1:8090` by default. The saved packet can contain sensitive graph data, and the server has no authentication. Keep it on loopback, or put it behind infrastructure that authenticates and authorizes every request before you bind it to another address.

## What is kept out of the graph

- Kubernetes Secrets arrive as object metadata and a sorted list of key names. Values, type, and annotations are excluded from collection payloads, from the native-event store, and from the graph. The informer still reads Secrets into memory, so the service account needs read access to them.
- Istio ServiceEntry endpoint values stay out. Only counts and address classes are kept.
- Telemetry is stored raw outside the graph. The graph holds bounded rollups and evidence IDs.
- Native events in PostgreSQL still hold provider object JSON, minus Secret values. That includes ConfigMap `data` and literal Pod `env` values, which are common places for credentials to end up. Protect the database accordingly.

## Verification

Verification proves that the declared policy and label are present. It does not prove the controller accepted them, that the datapath rolled out, or that traffic is blocked. See [Remediation](../../concepts/remediation/).

## Known limits

- On first start, or after a restart that lags, detection rebases to the current state instead of analyzing what changed while it was down.
- Detection works on batches of graph changes, so it is near real time, not instant. A telemetry rule that watches for a new operation or outcome on a pair that already communicates waits for the next unrelated graph change.
- One process runs per database, with no high availability. Prepared remediations, the collection hub, and telemetry rollups live in that process's memory.
- Publishing takes a global PostgreSQL advisory lock while it replaces a projection. Incremental, per-contribution maintenance is planned.
- Streaming APIs, coordinated consumer groups, retention, and historical replay are deferred. The change feed and contribution history have no retention policy.
- The Hubble Relay and agentgateway access-log transports are not provided yet.
- Cilium L7 policy and cross-namespace agentgateway backends are not covered.
- The AWS plugin reads EC2 instances, network interfaces, and security groups in one region. It does not read routing, gateways, network ACLs, or IAM, so a public address or an open rule is not treated as proof of exposure.
- Tenant isolation, per-source authorization of telemetry producers, audit logging, rate limiting, and secret scrubbing beyond Kubernetes Secrets are out of scope today.
