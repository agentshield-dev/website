---
title: Try the demo
description: Run the real web UI against a fake in-browser backend. No cluster, database, or model.
weight: 1
---

The demo runs the real explorer against a fake backend that lives in your browser. It needs no Go toolchain, PostgreSQL, cluster, or model, and nothing leaves your machine.

## Requirements

- `make`
- Node.js 22.12 or later (the repository pins 24) and pnpm 11. `corepack enable` provides the pnpm version the repository pins.

## Start it

```sh
git clone https://github.com/agentshield-dev/agentshield.git
cd agentshield
make demo
```

Open `http://127.0.0.1:5173`. The first run spends most of its time on `pnpm install`. Set `DEMO_PORT` to use another port.

## What to try

The playground starts with a clean findings view.

1. Choose a scenario, such as an unprotected catalog service.
2. Click **Trigger observation**. The scenario adds its finding with the evidence and the actions that would close it.
3. Click **Prepare** on a remediation to see the exact change, then **Approve and apply**. The simulated graph updates and the finding is invalidated.
4. Click **Reset** to return to the clean environment.

The fake backend follows the real API's filtering, paging, errors, and event stream, over an in-memory demo environment: a shop running on Kubernetes and Istio. `make ui-storybook` renders individual views and states, such as a fresh install or an unreachable service.

## Next

[Run locally](../run-locally/) to see your own cluster in the explorer.
