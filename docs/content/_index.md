---
title: agentshield docs
description: Run agentshield against Kubernetes or AWS, learn how findings are produced and fixes are approved, and write plugins.
---

## What it is

Agentshield is open source defense against lateral movement across Kubernetes and AWS. It builds a graph of what exists and what is allowed, watches telemetry for what actually happens, and investigates what is new. A finding cites the facts and evidence behind it. A fix is applied only after you approve it.

## What is in the box

| Piece | What it does |
| --- | --- |
| [Plugins](plugins/) | Each reads one system: Kubernetes, Istio, Cilium, agentgateway, and AWS. |
| [Graph](concepts/graph/) | Versioned in PostgreSQL. Every assertion keeps its plugin, rule, and evidence. |
| [Telemetry](concepts/telemetry/) | OTLP logs over `POST /v1/logs` and AWS VPC Flow Logs from Amazon Data Firehose, stored raw in JSONL or ClickHouse and rolled up into the graph. |
| [Reasoning](concepts/reasoning/) | Detects changes that are new and investigates them through six read-only tools. Optional, and needs a model endpoint. |
| Explorer | A web UI embedded in the binary: an overview, ranked findings, the environment graph, and a catalog of resources and relationships. You approve remediations there. |
| [Remediation](concepts/remediation/) | The Kubernetes, Cilium, and Istio plugins can apply fixes you approve. |
| [HTTP API](operations/api/) | JSON endpoints behind the explorer, plus a graph change stream. |

## Status

This is v0. Plugins read Kubernetes and AWS today. The graph and the plugin contract are provider-neutral, so other environments arrive as plugins. The AWS plugin is early and read-only: it observes EC2 networking and applies nothing.

The development API has no production authentication. Read the [security model](operations/security/) before exposing it.
