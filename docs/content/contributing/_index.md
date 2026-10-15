---
title: Contributing
description: Build and test the Go service and the web UI, and find where each part lives.
weight: 5
---

The service is Go. The explorer is a Vite and React app in `ui/`, embedded into the binary.

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
```

- `make ui` builds the UI into `ui/dist`, which the binary embeds.
- `make ui-dev` starts the Vite dev server on `http://localhost:5173` and proxies `/api` to the service. Run `make graph-ui` in another terminal first.
- `make ui-lint` runs the TypeScript and Biome checks that CI runs.
- `make ui-storybook` serves Storybook at `http://127.0.0.1:6006`. It renders the UI against a fake backend, so you need no PostgreSQL, service, or cluster.
- `make ui-test` runs every story and its interaction test in headless Chromium. The first run downloads Chromium through Playwright.

The fake backend lives in `ui/mocks`. Keep it in step with `pkg/api` when responses change.

## Where things live

| Directory | Contents |
| --- | --- |
| `cmd/` | Entry points: `agentshield` and `agentshield-reasoning-mcp` |
| `pkg/` | Core packages: api, discovery, graph, reasoning, remediation, state, telemetry |
| `plugins/` | The discovery plugins: kubernetes, istio, cilium, agentgateway, aws |
| `ui/` | The web UI |
| `docs/` | Architecture, data model, remediation, telemetry, and plugin docs, including one per plugin |
| `evals/` | Campaigns, scripts, and manifests |
| `deploy/` | The PostgreSQL compose file and the ClickHouse schema |
| `scripts/` | Utility scripts |

## Before you open a change

Run `make test`, `make lint`, and, for UI changes, `make ui-lint`. Change a plugin's behavior only with its tests, and run `make test-postgres` when you touch the graph or state packages. For Kubernetes or Istio changes, also run `make eval-run`. For AWS changes, also run `make test-aws-e2e`.

Source and issues: [github.com/solo-io/agentshield](https://github.com/solo-io/agentshield).
