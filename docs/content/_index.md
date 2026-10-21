---
title: agentshield docs
description: >-
  Run agentshield against Kubernetes or AWS, learn how findings are produced and
  fixes are approved, and write plugins.
weight: 10
---
## Reading order for newcomers

1. [What AgentShield does](/docs/concepts/overview/): the problem, the pipeline, and the components.
2. [Getting started](/docs/getting-started/run-locally/): run it locally.
3. [Glossary](/docs/concepts/glossary/): the vocabulary used everywhere else. If you read only one part, read [the five terms you need](/docs/concepts/glossary/#the-five-terms-you-need) at the top.
4. [Data model](/docs/concepts/data-model/): identities, assertions, and contributions.
5. [Architecture overview](/docs/architecture/): what runs where.

Then pick the area you are working on.

## Concepts

- [What AgentShield does](/docs/concepts/overview/)
- [Glossary](/docs/concepts/glossary/)
- [Data model](/docs/concepts/data-model/)
- [Security semantics](/docs/concepts/security-semantics/)

## Architecture

- [Overview](/docs/architecture/): process layout, data flow, HTTP API, known limits
- [Publication and storage](/docs/architecture/publication-and-storage/): contributions, generations, PostgreSQL, change feed, migrations
- [Change feed and reasoning](/docs/architecture/change-feed-and-reasoning/): detectors, model investigation, validation, findings
- [Telemetry](/docs/architecture/telemetry/): ingestion, event schema, rollups, backpressure
- [Detection rules](/docs/architecture/detection-rules/): CEL rules and model-authored Deployment rules
- [Remediation](/docs/architecture/remediation/): suggestions, actions, approval, verification

## Plugins

- [Plugin contract](/docs/plugins/contract/)
- [Tutorial: the life of a plugin](/docs/plugins/tutorial/)
- [Style guide](/docs/plugins/style-guide/)
- Providers: [Kubernetes](/docs/plugins/kubernetes/), [Istio](/docs/plugins/istio/), [Cilium](/docs/plugins/cilium/), [agentgateway](/docs/plugins/agentgateway/), [AWS](/docs/plugins/aws/)

## Operations

- [Configuration](/docs/operations/configuration/): every flag and environment variable
- [Helm deployment](https://github.com/solo-io/agentshield/blob/main/deploy/kubernetes/README.md): installation, PostgreSQL, ClickHouse, and access controls
- [Security model](/docs/operations/security/)

## Development

- [Testing](/docs/development/testing/)
- [Evaluation suite](https://github.com/solo-io/agentshield/blob/main/evals/README.md)
- [Contributing](https://github.com/solo-io/agentshield/blob/main/CONTRIBUTING.md)
