---
title: agentshield docs
description: Run agentshield against Kubernetes or AWS, learn how findings are produced and fixes are approved, and write plugins.
---

## What it is

Agentshield is open source defense against lateral movement across Kubernetes and AWS. It builds a graph of what exists and what is allowed, watches telemetry for what actually happens, and flags what is new. A finding cites the facts and evidence behind it. A fix is applied only after you approve it.

## What is in the box

| Piece | What it does |
| --- | --- |
| [Plugins](plugins/) | Each reads one system or signal: Kubernetes, Istio, Cilium, agentgateway, Falco, and AWS. |
| [Graph](concepts/graph/) | Versioned in PostgreSQL. Every assertion keeps its plugin, rule, and evidence. |
| [Telemetry](concepts/telemetry/) | OTLP logs over `POST /v1/logs`, such as Istio access logs and Falco alerts, and AWS VPC Flow Logs from Amazon Data Firehose, stored raw in JSONL or ClickHouse and rolled up into the graph. |
| [Detection](concepts/detection/) | Built-in checks flag what is new. [Rules](concepts/rules/) you write, or that a model drafts and you approve, turn a match into a finding with no model call. |
| [Reasoning](concepts/reasoning/) | Investigates new paths and exposure through six read-only tools. Optional, and needs a model endpoint. |
| Explorer | A web UI embedded in the binary: an overview, ranked findings, a rules view, the environment graph, and a catalog of resources and relationships. You approve remediations and rule drafts there. |
| [Remediation](concepts/remediation/) | The Kubernetes, Cilium, and Istio plugins can apply fixes you approve. |
| [HTTP API](operations/api/) | JSON endpoints behind the explorer, plus a graph change stream. |

## Status

This is pre-1.0, so expect breaking changes to APIs, the database schema, and flags. Plugins read Kubernetes and AWS today. The graph and the plugin contract are provider-neutral, so other environments arrive as plugins. The AWS plugin is early and read-only: it observes EC2 networking and applies nothing.

The HTTP API and UI have no authentication. Read the [security model](operations/security/) before exposing them.
