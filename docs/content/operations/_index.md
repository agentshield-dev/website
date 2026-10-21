---
title: Operations
description: Configure and deploy the service, understand its security model, call its API, and measure it with evals.
weight: 4
---

Agentshield is pre-1.0. These pages describe what the service does today, including what it does not do yet.

- [Configuration](configuration/) lists every flag and environment variable.
- [Deploy with Helm](helm/) installs it on Kubernetes with a read-only ClusterRole.
- [Security model](security/) covers what is authenticated, what is loopback-only, and what lives in memory.
- [Evals](evals/) runs six campaigns against a disposable cluster and a model, plus a rule suite.
- [HTTP API](api/) lists the JSON endpoints behind the explorer.
