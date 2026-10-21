---
title: Contributing
description: Build and test the Go service and the web UI, and find where each part lives.
weight: 5
---

The service is Go. The explorer is a Vite and React app in `ui/`, embedded into the binary. Contributions are licensed under Apache License 2.0, and DCO sign-off is not required.

You need Go 1.27 or later, [golangci-lint](https://golangci-lint.run) v2 for `make lint`, Docker for PostgreSQL and the integration tests, Node.js 24 with pnpm for UI work, and kind with kubectl for local clusters and end-to-end tests.

## Build and test

```sh
make build
make test
make lint
make test-postgres
make test-aws-e2e
```

`make test-postgres` runs the PostgreSQL integration tests with the race detector in a disposable container. `make test-aws-e2e` runs the AWS plugin end to end in a disposable kind cluster that holds LocalStack, PostgreSQL, and the service. It checks the startup inventory, Security Group updates triggered through EventBridge and SQS, ENI retraction, and a Firehose-format VPC Flow Log reaching the telemetry sink. The events are synthetic, so it does not validate AWS-managed CloudTrail, VPC Flow Logs, or Firehose delivery. `make lint-fix` applies the lint fixes it can.

## Web UI

```sh
make ui
make ui-dev
make ui-lint
make ui-storybook
make ui-test
make demo
```

- `make ui` builds the UI into `ui/dist`, which the binary embeds.
- `make ui-dev` starts the Vite dev server on `http://localhost:5173` and proxies `/api` to the service. Run `make graph-ui` in another terminal first.
- `make ui-lint` runs the TypeScript and Biome checks that CI runs.
- `make ui-storybook` serves Storybook at `http://127.0.0.1:6006`. It renders the UI against a fake backend, so you need no PostgreSQL, service, or cluster.
- `make ui-test` runs every story and its interaction test in headless Chromium, plus the unit tests. The first run downloads Chromium through Playwright.
- `make demo` serves the same fake backend as an interactive playground at `http://127.0.0.1:5173`. See [Try the demo](../getting-started/try-the-demo/).

The fake backend lives in `ui/mocks`. Keep it in step with `pkg/api` when responses change.

## Where things live

| Directory | Contents |
| --- | --- |
| `cmd/` | Entry points: `agentshield`, `agentshield-detector-rules`, `agentshield-deployment-author`, and `agentshield-reasoning-mcp` |
| `pkg/` | Core packages: api, detector, deploymentauthoring, discovery, graph, reasoning, remediation, state, telemetry |
| `plugins/` | The plugins: kubernetes, istio, cilium, agentgateway, falco, aws |
| `ui/` | The web UI |
| `docs/` | Concepts, architecture, plugin, and operations docs, including one page per plugin |
| `evals/` | Campaigns, rule campaigns, scripts, and manifests |
| `deploy/` | The PostgreSQL compose file, the ClickHouse schema, and the Helm chart |
| `examples/` | Authoring contexts for the Deployment rule author |
| `scripts/` | Utility scripts |

## Before you open a change

Discuss large changes or new plugins in an issue first. Run `make test`, `make lint`, and, for UI changes, `make ui-lint`. Change a plugin's behavior only with its tests, and run `make test-postgres` when you touch the graph or state packages. Add migrations as new files in `pkg/state/migrations/` and never edit an applied one. For AWS changes, also run `make test-aws-e2e`.

Changes to Kubernetes or Istio plugin projection need a cluster evaluation before merging, which makes billed model calls. A maintainer can run it. Update the docs that describe any behavior or configuration you change, and leave credentials, runtime data, and generated UI files out of commits.

Source and issues: [github.com/solo-io/agentshield](https://github.com/agentshield-dev/agentshield).

Maintainers: [Repository publication checklist](repository-migration/).
