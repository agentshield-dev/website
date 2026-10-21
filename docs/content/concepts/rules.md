---
title: Detection rules
description: Write CEL rules, let a model draft a rule for each Deployment, and review drafts before they can raise findings.
weight: 5
---

Rules add to the [built-in checks](../detection/#built-in-checks). There are two kinds, and both run inside detection, so a match never calls a model.

- **CEL rules** are written by operators, stored as versioned rulesets in PostgreSQL, and reloaded without a restart.
- **Deployment rules** are drafted by a model, one set per Kubernetes Deployment. A draft runs in shadow mode until an operator approves it.

Every match of an active rule becomes a finding with `origin: detection_rule` and no model call. The operator's activation or approval is the decision. Rules read normalized graph data only. They never parse provider payloads or open provider connections.

## CEL rules

### Inputs

A rule evaluates inputs built from the difference between the previous and the current graph.

| Input type | Kinds | When it fires |
| --- | --- | --- |
| `relationship` | Every registered predicate | Once, when an edge first appears resolved. Lease refreshes and removals produce no input. |
| `telemetry` | `network-flow`, `gateway-request`, `active-probe`, `process-exec` | Once per new combination of kind, endpoints, operation, and outcome, per plugin and source. Count, property, or evidence changes alone do not fire. |

A rule selects inputs by `pluginId` (or `*`), `type`, and `kind`. It can also set `workloadResourceId` to match only inputs anchored to one workload, including Pods connected to that Deployment by a resolved `instantiates` edge. Each selector compiles in its own CEL environment that declares only the variables it fills in, so referencing a variable that would always be empty is a compile error.

| Variable | Available for | Values |
| --- | --- | --- |
| `operation` | Telemetry selectors | Depends on the kind, for example `GET /path`, `ingress`, `egress` |
| `outcome` | Telemetry selectors | `allowed` or `denied` for probes and gateway requests, datapath verdicts such as `forwarded` or `dropped` for flows |
| `destination_ip_class` | `telemetry:network-flow`, `relationship:communicates-with` | `public`, `private`, `special` (loopback, link-local, and other non-global ranges), `unknown` |
| `destination_role` | Communication selectors | `control-plane-api`, `service`, `workload`, or empty when the address belongs to no known resource |
| `process_class` | `telemetry:process-exec`, `relationship:executes` | The process class, currently `shell` |

Raw IP addresses are never exposed to CEL.

Alert when a workload talks to a public address that belongs to no known resource:

```cel
destination_ip_class == 'public' && destination_role == ''
```

Alert when a Pod starts an interactive shell, as reported by the [Falco plugin](../../plugins/falco/). Select `relationship:executes` or `telemetry:process-exec`:

```cel
process_class == 'shell'
```

Either fires once per Pod and lease lifetime, not once per shell. Rules that need every raw request, property-only changes, or aggregation over a time window are not supported.

### Ruleset format

```json
{
  "id": "security/v2",
  "rules": [
    {
      "id": "unknown-public-destination",
      "revision": 1,
      "inputVersion": "v1",
      "pluginId": "*",
      "type": "relationship",
      "kind": "communicates-with",
      "expression": "destination_ip_class == 'public' && destination_role == ''",
      "risk": "medium",
      "reasons": ["unknown_public_destination"],
      "windowSeconds": 300
    }
  ]
}
```

- `expression` must return a boolean.
- `risk` is `low`, `medium`, `high`, or `critical`. It becomes the severity of the rule's findings.
- `windowSeconds` is the half-width of the time window around the observation. `0` uses the default of 5 minutes, and the maximum is 24 hours.

### Manage rulesets

PostgreSQL stores immutable rule revisions, immutable rulesets, an audited activation history, and one active pointer. Use the CLI, not direct SQL.

```sh
export AGENTSHIELD_DATABASE_URL=...
go run ./cmd/agentshield rules validate --file rules.json
go run ./cmd/agentshield rules save --file rules.json --actor alice
go run ./cmd/agentshield rules show
go run ./cmd/agentshield rules activate --id security/v2 --expected-revision 1 --actor bob
```

- `validate` compiles every rule and prints the ruleset digest. It does not touch the database.
- `save` validates and stores the ruleset without activating it. Saving the same ID and revision with different content is rejected.
- `show` prints the active ruleset and its activation revision. `show --id` prints a saved ruleset.
- `activate` makes a saved ruleset active if the current activation revision equals `--expected-revision`, which is `0` when nothing is active. If someone else activated in between, it fails.
- To roll back, activate an older saved ruleset. That creates a new activation revision.

A ruleset replaces the whole active ruleset, so include shared rules in the new set. An empty ruleset disables all CEL rules, and the built-in checks still run.

`--actor` is recorded for audit. It is not authentication. There is no HTTP API for ruleset management. Enforce the split between authors and approvers through database roles.

Inspect what the rules matched:

```sh
go run ./cmd/agentshield rules signals --limit 50
go run ./cmd/agentshield rules signals --investigation rule_finding
```

### Runtime behavior

On start, agentshield saves and activates the empty ruleset `builtin/v1` if none is active, then loads the active ruleset. A ruleset that fails to compile at startup stops the process.

Every `--detector-reload-interval` (10 seconds) it checks for a new activation. A new ruleset is compiled completely and swapped in atomically, and evaluations already running keep the ruleset they started with. If a reload fails, the last good rules stay active and the failure is logged. Rule changes apply to future windows only and do not re-evaluate history.

### Limits

- 256 rules per ruleset. The loaded Deployment rules are capped at 30,000, which leaves room for about 5,000 Deployments.
- 8 KiB per expression and 10,000 CEL cost units per evaluation of an expression.
- 64 KiB per input, 100,000 inputs per evaluation, and 1,000 signals per evaluation.
- 1 to 16 reasons per rule, up to 128 bytes each.

CEL has no I/O functions. Do not put credentials or raw evidence into expressions or reasons.

## Deployment rules

With `--deployment-rule-authoring`, agentshield asks a model to draft up to three narrow CEL rules for each Deployment Pod template revision. It waits for a baseline window first and drafts from the Deployment's [observed behavior](#observed-behavior), so the rules describe what this workload normally does. The draft runs in shadow mode at once, and an operator approves it to make it active.

Authoring is its own queue with its own worker. Writing a rule is a model call. Running one is not.

### When a draft is queued

A revision is identified by the Kubernetes plugin's `kubernetes/pod-template-sha256` attribute, a digest of the Pod template's spec and labels. Annotations are excluded, so `kubectl rollout restart` is not a new revision. A new image, command, environment, or label is.

| Event | Result |
| --- | --- |
| A new Deployment | A job is queued. A deleted and recreated Deployment is new. |
| A changed Pod template | A job is queued, and queued jobs for the Deployment's other revisions are dropped |
| A return to an earlier revision that already has a job | Nothing |
| Scaling, restarts, and assertions from other plugins | Nothing |

Each Pod template revision gets one draft, including every Deployment already in the graph. Jobs queue whether or not authoring is on, so turning it on later drafts for all of them. Authoring is not sampled or budgeted.

### The worker

A worker claims a job that is at least `--deployment-rule-baseline-window` old (6 hours by default, 0 to 24 hours), reads the Deployment's observed behavior from the current graph, and calls the model. `--deployment-rule-authoring-timeout` (5 minutes, minimum 30 seconds) caps the call. It validates the proposal and stores it on the job.

Telemetry leaves the graph after 24 hours, so a longer window would not lengthen the baseline. A short window drafts from little traffic, and behavior that appears only after the window, such as a daily job, is missing from the baseline. Failures are retried with exponential backoff. Processing is at-least-once, so a crash after the model answers causes a second call.

Click **Author now** in the explorer, or call `POST /api/v1/workloads/{id}/rule-drafts`, to skip the wait.

### What the model sees and returns

The request holds the Deployment's kind, name, namespace, service account, and observed behavior. Labels, images, environment, and volumes are never stored or sent. The model has two tools. It records each rule with `add_rule`, giving a selector, an expression, and a rationale, and ends the run with `finish`. The host validates each rule as it is added: selector, CEL compilation, the three-rule limit, and duplicates. A proposal with no rules is a valid answer.

The host sets the rule ID, plugin `*`, the workload scope, risk `medium`, the reason `workload_rule_match`, and a 300-second window. The model has no access to the database, the graph, or rule activation.

OpenAI is the default provider and uses the Responses API. `--model-provider=anthropic` uses Anthropic's Messages API.

### Observed behavior

The context carries a baseline of the Deployment's own outbound requests, built from the graph.

- **Destinations.** Kubernetes destinations are named `namespace/name`. Others are described by kind and network role only, never by address.
- **Operations.** Query strings and fragments are removed, and path segments that look like identifiers, all digits or 16 or more hex characters and dashes, become `{id}`. Rules still evaluate raw operations.
- **Size.** At most 32 requests, the most frequent first, with a flag when truncated.
- **Collected telemetry.** Up to 16 telemetry kinds observed anywhere in the graph, so the author can tell a workload that made no requests from telemetry that is not visible.

Normalized request paths go to the model endpoint. They can still carry identifiers that the patterns do not catch, such as names or emails.

### Review

A job's review status decides the mode.

| Review status | Mode | Effect of a match |
| --- | --- | --- |
| `pending` | Shadow | Recorded in `detection_signals` only |
| `approved` | Active | A finding, with no model call |
| `rejected` | Not loaded | None |

For each Deployment still in the graph, at most two completed proposals load. The active one is the current revision's rule if it is approved, otherwise the newest approved rule of another revision. The shadow one is the current revision's pending draft. An approved rule therefore keeps running after a template change until the new revision's draft is approved. Rolling back to a revision with an approved rule makes that rule active again. A rule is evaluated only against inputs anchored to its Deployment or its Pods, so cost does not grow with the number of Deployments.

```sh
go run ./cmd/agentshield rules jobs
go run ./cmd/agentshield rules job --job-id 42
go run ./cmd/agentshield rules review --job-id 42 --decision approved --actor alice
go run ./cmd/agentshield rules workload-rules
```

`review` accepts `approved` or `rejected` for a completed job and can change an earlier decision. Drafts are not edited in place. To change a rule, reject it and add a replacement to a CEL ruleset.

The explorer's Rules view and a Deployment's inspector use these routes:

| Route | Purpose |
| --- | --- |
| `GET /api/v1/rules` | The active ruleset and the loaded Deployment rules, each marked `active` or `shadow` |
| `GET /api/v1/rule-drafts` | Up to 500 jobs, newest first |
| `GET /api/v1/rule-drafts/{id}` | One job and, once completed, its proposal with the `add_rule` and `finish` trace |
| `POST /api/v1/rule-drafts/{id}/review` | Approve or reject a completed draft |
| `POST /api/v1/workloads/{id}/rule-drafts` | Author a Deployment's current revision now, or regenerate a completed draft |

A regenerated draft drops its earlier proposal and review, and its rules run in shadow mode until it is approved. The two `POST` routes change detection and call the model, and the API has no authentication, so they answer only on a loopback listener. On any other listener they return `503` unless `--rule-review-api` is set, which belongs only behind an authenticating proxy or in a disposable environment. See the [security model](../../operations/security/).

### Try the author without a cluster

`agentshield-deployment-author` runs the same author against a local JSON file. It opens no database and activates nothing. Start from `examples/deployment-authoring-context.json` or `examples/istiod-authoring-context.json` in the repository.

Print the exact first request without calling a model, with no credentials needed:

```sh
go run ./cmd/agentshield-deployment-author --input examples/deployment-authoring-context.json --dry-run
```

Call a model and print one validated proposal:

```sh
export AGENTSHIELD_MODEL_ENDPOINT=https://api.openai.com
export OPENAI_API_KEY=...
go run ./cmd/agentshield-deployment-author --input examples/deployment-authoring-context.json > proposal.json
```

For Anthropic, set `ANTHROPIC_API_KEY` and add `--model-provider anthropic`. Add `--verbose` to log each `add_rule` call.

## How rules are measured

The [rule eval suite](../../operations/evals/#rule-evals) scores operator rules and the rules the author drafts against nine campaigns built for rules. It needs no model for operator rules.
