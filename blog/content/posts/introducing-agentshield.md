---
title: Introducing agentshield
description: Open source defense for Kubernetes and AWS that assumes every attacker is an agent. It learns how workloads really talk, flags lateral movement with evidence, and proposes fixes you approve.
date: 2026-10-15T09:00:00Z
lastmod: 2026-10-15T09:00:00Z
draft: true
author: agentshield team
categories:
  - Announcement
tags:
  - agentshield
  - kubernetes
  - aws
  - lateral movement
---

Defense in depth already assumes a breach. What changed is who is on the other side. An agent reads the whole environment, tries every route from the workload it holds, and does not get tired. Reviewing alerts one at a time cannot keep that pace. The reviewer has to be an agent too, and it has to show its evidence.

Agentshield is open source defense against lateral movement across Kubernetes and AWS. The job is to spot one attack path, pin it to evidence, and close it with a fix you approve.

## What it does

- **It reads your systems.** Plugins are Go packages that each know one platform. Kubernetes, Istio, Cilium, agentgateway, Falco, and AWS are in the box.
- **It maps them in one graph.** Workloads, identities, policies, and exposures become nodes in PostgreSQL. Every assertion keeps the plugin, rule, and evidence that produced it.
- **It detects what changes.** Built-in detectors flag new paths, new exposure, and lost governance. Rules you write, or that a model drafts and you approve, turn a match into a finding with no model call. A new path or exposure goes to an investigator model that walks the graph through six read-only tools and answers with evidence, or with nothing. A finding is promoted only if it cites facts the graph actually returned.
- **It proposes fixes you approve.** Plan, dry run, approve, apply, verify. Nothing is written before the approval step.

## Same request, different verdict

Lateral movement looks like normal traffic until you know what is allowed. So every attack in our evals has a benign twin that makes the identical request.

A compromised `checkout-api` and a `secret-rotation-controller` both send `GET /v1/secret/data/payment-signing-key`. Only one of them has a declared path to that key. Agentshield raises a `possible_lateral_path` finding for the first and stays quiet for the second.

## What it does not do yet

This is v0, and we would rather say so up front.

- It reads Kubernetes and AWS EC2 networking today. The graph and the plugin contract are provider-neutral, so other environments will arrive as plugins. The AWS plugin is early and read-only, and it does not model routing, gateways, network ACLs, or IAM.
- The HTTP API and UI have no authentication, approval state lives in memory, and it runs as one process per database.
- Verification proves that the declared policy is present. It does not prove that traffic is blocked.
- Detection works on batches of graph changes, so it is near real time, not instant.
- It is pre-1.0. Expect breaking changes to APIs, the database schema, and flags.

## Try it

No cluster? [Try the demo](/docs/getting-started/try-the-demo/), which runs the real UI against fake data in your browser. To run it against your own cluster, start with [Run locally](/docs/getting-started/run-locally/), then [enable reasoning](/docs/getting-started/enable-reasoning/) to get findings. The code is on [GitHub](https://github.com/agentshield-dev/agentshield).
