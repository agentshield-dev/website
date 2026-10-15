---
title: Getting started
description: Run agentshield against Kubernetes or AWS, open the explorer, and turn on reasoning.
weight: 1
---

Agentshield is a single Go binary with the explorer built in. It needs PostgreSQL and something to read: a Kubernetes context, AWS credentials, or both. Reasoning is optional and needs a model endpoint.

1. [Run locally](run-locally/) starts PostgreSQL and the service against your current Kubernetes context, or against AWS on its own.
2. [Enable reasoning](enable-reasoning/) points it at a model so it can investigate changes and write findings.

Agentshield is v0. The development API has no production authentication, so keep it on a loopback address. See the [security model](../operations/security/).
