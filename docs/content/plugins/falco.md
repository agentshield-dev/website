---
title: Falco
description: How shell alerts from Falco reach the graph, how to wire a collector to agentshield, and how a rule can match on them.
weight: 5
---

The Falco plugin is early and telemetry-only. It maps Falco runtime alerts that an existing OpenTelemetry Collector forwards to the shared OTLP receiver. It opens no provider connection, consumes no collection, and owns no inventory. The initial scope is one use case: a Pod started an interactive shell.

| Detail | Value |
| --- | --- |
| Role | Telemetry mapper. Version 0.1.0. |
| Authority | `--falco-cluster-id`. Match the Kubernetes source so Pod identities converge. |
| Source ID | `--falco-source-id` |
| Telemetry kind | `process-exec` |
| Graph output | A Pod `executes` lease to the `shell` process class |
| Cursor | None. The collector's file offset is the delivery cursor. |

## Send alerts to agentshield

Both routes deliver the same Falco JSON alert as an OTLP log body with the resource attribute `service.name=falco`, so one mapper handles either.

| Route | What it deploys | Delivery |
| --- | --- | --- |
| HTTP output, the default | A `webhook_event` receiver on an existing collector Deployment | Falco does not retry, so alerts sent while the collector is down are lost |
| Container logs | A collector DaemonSet with a read-only `/var/log/pods` hostPath | The collector resumes from its file offset |

Use the HTTP route when you already run a collector Deployment and do not want a node-level DaemonSet. Use the container-log route when losing alerts during a collector restart is not acceptable.

Both routes need JSON alerts with the Pod UID appended to every syscall rule. `k8s.pod.uid` comes from container runtime labels and needs no Kubernetes API access from Falco:

```yaml
falco:
  json_output: true
  json_include_output_property: true
  append_output:
    - match:
        source: syscall
      extra_fields:
        - k8s.pod.uid
        - container.id
```

The mapper trusts `service.name=falco`, so restrict who can produce it. On the HTTP route, admit only Falco Pods to the receiver port. On the container-log route, read only the Falco container's log files. Do not use Falcosidekick's `otlp/logs` output: as of Falcosidekick 2.31 it drops `output_fields`, so no Pod UID reaches agentshield.

### HTTP output route

Falco posts one alert per request, and the collector's `webhook_event` receiver, from the contrib distribution, places the request body in the log body.

```yaml
# Falco values
falco:
  http_output:
    enabled: true
    url: http://opentelemetry-collector.observability.svc.cluster.local:8080/falco
```

```yaml
# Collector (otel/opentelemetry-collector-contrib)
receivers:
  webhook_event/falco:
    endpoint: 0.0.0.0:8080
    path: /falco

processors:
  resource/falco:
    attributes:
      - key: service.name
        value: falco
        action: upsert

exporters:
  otlp_http/agentshield:
    endpoint: http://agentshield.agentshield-system.svc.cluster.local:8088
    encoding: proto

service:
  pipelines:
    logs/falco:
      receivers: [webhook_event/falco]
      processors: [resource/falco, batch]
      exporters: [otlp_http/agentshield]
```

The receiver is unauthenticated. Add a NetworkPolicy that admits only Falco Pods to its port.

### Container-log route

Leave Falco's default stdout output on. Run a collector DaemonSet that mounts `/var/log/pods` read-only and reads the Falco container's logs:

```yaml
receivers:
  filelog/falco:
    include: [/var/log/pods/falco_falco-*/falco/*.log]
    start_at: end
    operators:
      - type: container

processors:
  resource/falco:
    attributes:
      - key: service.name
        value: falco
        action: upsert

service:
  pipelines:
    logs/falco:
      receivers: [filelog/falco]
      processors: [resource/falco, batch]
      exporters: [otlp_http/agentshield]
```

Falco's own non-JSON log lines share that file and are rejected by the mapper.

### Unmapped alerts

Every alert reaches agentshield, and alerts from unmapped rules are rejected through OTLP partial success, which the collector logs as a warning. To forward only shell alerts, add a filter to either pipeline:

```yaml
processors:
  filter/falco-shell:
    error_mode: ignore
    logs:
      log_record:
        - 'not IsMatch(body, "\"rule\":\"Terminal shell in container\"")'
```

## Mapping

A record matches when its resource `service.name` is `falco`. The body can be the raw JSON line or a collector-parsed map.

| Event field | Value |
| --- | --- |
| `kind` | `process-exec` |
| `observedAt` | The alert's `time`, the original Falco event time |
| `subject` | The Pod, by `output_fields["k8s.pod.uid"]` |
| `object` | The `shell` process class |
| `operation` | `spawn-shell` |
| `outcome` | `observed`. Falco detects but does not block. |
| `coverage` | `falco-runtime-alert` |
| `properties` | `falco/rule`, `falco/priority`, and `container-id` when present, in the raw sink only |

The event ID is stable across collector retries. The mapper rejects, without echoing payload values, rules other than the configured shell rules (default `Terminal shell in container`), sources other than `syscall`, alerts without a Pod UID such as host processes and non-Kubernetes containers, alerts without an RFC 3339 `time`, and bodies that are not one JSON object.

Process command lines, user names, file paths, and environment details are never copied into normalized properties, because they can contain credentials.

## Graph output and detection

The rollup projects a Pod `executes` lease to the `shell` resource, which the graph explorer shows as an edge into the `shell` node. The lease follows the same lifecycle as `communicates-with`: it is created by the first observation, unchanged by later shells, refreshed near the end of retention while shells continue, and retracted after retention without shells. It never implies network reachability.

Creating the lease advances the change feed, so a [detection rule](../../concepts/rules/) can match on it. Select `relationship:executes` or `telemetry:process-exec` with `process_class == 'shell'`. Both selectors appear in the schema the Deployment rule author sees, so the model can propose a no-shell rule alongside others for a new workload. Detection fires once per Pod within rollup retention, not once per shell, and every alert stays in the raw sink.

## Tracing a shell alert

Falco's shell rule fires only for an interactive terminal, so open the shell with `kubectl exec -it`. Without `-it`, no alert is raised.

| Step | Where to look | What you should see |
| --- | --- | --- |
| Falco saw it | `kubectl -n falco logs ds/falco -c falco` | `"rule":"Terminal shell in container"` with `k8s.pod.uid` in `output_fields` |
| agentshield received it | agentshield logs | `telemetry pipeline accepted=1 written=1`, or a `rejected OTLP log records` warning that names an unmapped rule |
| It reached the graph | `GET /api/v1/graph`, `snapshot.telemetry[]` with `kind == "process-exec"` | One `spawn-shell` entry per Pod and minute, and the Pod's `executes` edge to `shell` |
| A rule fired | agentshield logs | `detection rules matched rule_signals=1`. `shadow_signals` counts unapproved drafts, which raise no finding. |
| A finding exists | The Findings view, or `GET /api/v1/findings` | A `detection_rule_match` finding for the Deployment's rule |

A trace that stops before "A rule fired" usually means the Deployment has no active shell rule, so approve its draft in the Rules view, or that the Pod already raised a detection within retention.

## Failure and scale

From the collector onward, delivery, retry, and backpressure follow the shared OTLP receiver and telemetry pipeline. Loss before the collector depends on the route. Shell alerts are sparse, human-driven events, and change-feed events are bounded by lease creation, refresh, and expiry per Pod, not by shell count.

`process-exec` telemetry and the `executes` relationship are provider-native runtime evidence and carry no security semantics. An observation does not establish an exposure or governance fact. Rules and reasoning interpret it.
