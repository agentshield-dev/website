---
title: HTTP API
description: The JSON endpoints behind the explorer, their filters and pagination, the rule routes, and the graph change stream.
weight: 5
---

The explorer is a client of this API, and your own tooling can be too. It is a development API with no production authentication, so keep the listener on loopback or behind an authenticated gateway. See the [security model](../security/).

Read endpoints return JSON. An error is `{"error": "<action>: <reason>"}`. The API sets a strict Content Security Policy, `Referrer-Policy: no-referrer`, and `X-Content-Type-Options: nosniff` on every response.

## Health

| Endpoint | Meaning |
| --- | --- |
| `GET /healthz` | `204` whenever the process is up. |
| `GET /readyz` | `204` once PostgreSQL answers and a graph has been materialized. Otherwise `503`. |

## Graph

| Endpoint | Returns |
| --- | --- |
| `GET /api/v1/overview` | Resource, relationship, facet, telemetry, and exposure counts, the graph manifest, and up to five active findings. |
| `GET /api/v1/graph` | The latest canonical graph snapshot. Its ETag is the snapshot's SHA-256 digest. |
| `GET /api/v1/manifest` | A manifest of the contribution versions behind the current graph, for reproducible analysis. |
| `GET /api/v1/neighborhood` | A bounded neighborhood around `resourceId`. `depth` defaults to 2, `limit` to 500, and `direction` to `both`. |
| `GET /api/v1/events` | A server-sent event stream. Each `graph` event carries the new `sha256` and `generatedAt`. |

## Catalog

| Endpoint | Returns |
| --- | --- |
| `GET /api/v1/resources` | Resources sorted by ID. Filters: `q` for text, `kind`, and `namespace`. |
| `GET /api/v1/resources/{resourceID}` | One resource with its relationships, its facets, and up to 100 findings that affect it. |
| `GET /api/v1/relationships` | Relationships. Filters: `q`, `predicate`, and `resourceId`. |
| `GET /api/v1/relationships/{relationshipID}` | One relationship with its subject and object resources. A relationship with an unresolved endpoint answers with a conflict. |
| `GET /api/v1/exposures` | Exposure facts from the typed security semantics. Filters: `state`, `coverage`, and `resourceId`. |

Lists are paginated with `limit`, from 1 to 100 and 25 by default, and an opaque `cursor`. A response with more pages carries `nextCursor`. Every catalog response includes `graphSha256`, the digest of the graph it was read from.

## Findings

| Endpoint | Returns |
| --- | --- |
| `GET /api/v1/findings` | Findings, newest first, with `total` and `nextCursor`. Filters: `status` (`active` or `invalidated`), `severity`, `category`, and `affectedEntityId`. `limit` is 1 to 100 and defaults to 50. |
| `GET /api/v1/findings/{findingID}` | One finding, including its remediation proposals. |

The three remediation endpoints live under a finding. See [Remediation](../../concepts/remediation/#http-api).

A finding's `origin` is `agentic_investigation` or `detection_rule`. A rule finding has the category `detection_rule_match`, names the rule and its revision, and carries no remediation proposals.

## Rules

The explorer's Rules view uses these routes. See [Detection rules](../../concepts/rules/#review).

| Endpoint | Returns or does |
| --- | --- |
| `GET /api/v1/rules` | The active operator ruleset, with `activation` null when none is active, and the loaded Deployment rules, each marked `active` or `shadow`. |
| `GET /api/v1/rule-drafts` | Up to 500 Deployment rule jobs, newest first, with each job's review status, rule count, requester, and whether it is for the Deployment's current revision. |
| `GET /api/v1/rule-drafts/{id}` | One job and, once completed, its proposal: rationale, rules, and the `add_rule` and `finish` trace. |
| `POST /api/v1/rule-drafts/{id}/review` | Approve or reject a completed draft with `{"decision":"approved"}` or `"rejected"`. A job that is not completed answers with a conflict. |
| `POST /api/v1/workloads/{id}/rule-drafts` | Author a Deployment's current revision now. Answers `202` with the job, a conflict while a worker is authoring it, and not found when the Deployment has no job for its current revision. |

The two `POST` routes change detection and call the model. They answer only on a loopback listener, and on any other listener return `503` unless `--rule-review-api` is set. Decisions are recorded with the actor `api/web-ui`, which is audit metadata, not an identity.

## Intake

| Endpoint | Accepts |
| --- | --- |
| `POST /v1/logs` | OTLP/HTTP logs, protobuf or JSON, optionally gzip-compressed. See [Telemetry](../../concepts/telemetry/). |
| `POST /v1/aws/firehose/vpc-flow-logs` | VPC Flow Logs from Amazon Data Firehose. Present only with `--aws-firehose-stream-arn`. See [AWS](../../plugins/aws/). |

## The explorer

`GET /` serves the explorer and `GET /assets/` its files, all from the binary. If the UI was not built, `/` answers `503` with a hint to run `make ui`.
