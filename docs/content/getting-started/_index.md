---
title: Getting started
description: Try the demo, run agentshield against Kubernetes or AWS, open the explorer, and turn on the model features.
weight: 1
---

Agentshield is a single Go binary with the explorer built in. It needs PostgreSQL and something to read: a Kubernetes context, AWS credentials, or both. A model is optional, and only findings need one.

1. [Try the demo](try-the-demo/) runs the real UI against fake data in your browser. It needs only Node.js and pnpm.
2. [Run locally](run-locally/) starts PostgreSQL and the service against your current Kubernetes context, or against AWS on its own.
3. [Enable reasoning](enable-reasoning/) points it at a model so it can detect and investigate changes and write findings.

To run it on a cluster instead, see [Deploy with Helm](../operations/helm/).

Agentshield is pre-1.0. The HTTP API and UI have no authentication, so keep them on a loopback address. See the [security model](../operations/security/).
