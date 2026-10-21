---
title: Istio
description: How the Istio plugin describes mesh security in the graph, how to send it waypoint access logs, and the mutual TLS fix it can apply.
weight: 2
---

The Istio plugin describes Istio security configuration in the graph: authorization policy, mutual TLS policy, ambient enrollment, waypoints, ServiceEntries, and VirtualService routing. It also maps Istio waypoint access logs into telemetry and provides the PeerAuthentication remediation action.

It reads Kubernetes collections and never opens its own Kubernetes watch.

| Detail | Value |
| --- | --- |
| Role | Semantic plugin, telemetry mapper, and remediation provider |
| Authority | `--istio-cluster-id`. Network destinations use `--istio-network-id`. |
| Source ID | `--istio-source-id` |
| Mesh root namespace | `--istio-root-namespace` (default `istio-system`) |
| Contribution | `semantics`, plus telemetry rollups in `rollups` |

Set `--istio-cluster-id` and `--istio-source-id` to the Kubernetes plugin's values so Istio assertions land on the same objects. See [Kubernetes](../kubernetes/).

## Kubernetes resources requested

| Capability | Resources | Required |
| --- | --- | --- |
| `istio-core-v1` | namespaces, pods, services | Yes |
| `istio-workloads-v1` | deployments | Yes |
| `istio-gateway-v1` | Gateway API gateways | No |
| `istio-security-v1` | `security.istio.io/v1` authorizationpolicies, peerauthentications | No |
| `istio-networking-v1` | `networking.istio.io/v1` serviceentries, virtualservices | No |

If the Istio CRDs are not installed, coverage is `unsupported` and the plugin publishes what it can. Missing coverage does not mean there is no policy.

## What goes in the graph

| Output | Meaning |
| --- | --- |
| Workload `governed-by` AuthorizationPolicy | Authorization governance, with a posture facet on the policy |
| Workload `governed-by` PeerAuthentication | Transport-authentication governance, with an `istio-mtls` facet on the target |
| `istio-data-plane` facet on enrolled workloads | Ambient enrollment intent |
| Workload `governed-by` waypoint Gateway | An observed binding with `effect=unknown` |
| ServiceEntry `exposes` network destination | One edge for each host, with endpoint counts and address classes, never endpoint values |
| VirtualService `exposes` destination | Route count, subsets, ports, and mirror flag |

The ambient facet records enrollment intent and waypoint binding. It does not claim that traffic is encrypted or that policy is enforced. VirtualService forwarding and ServiceEntry declarations stay provider-native.

## Telemetry

The Istio mapper turns waypoint access logs into `active-probe` events. It matches OTLP records whose attribute `agentshield.telemetry.kind` is `active-probe`. The subject is the caller and the object is the destination.

Istio's default access logs do not carry these attributes. You need a custom `envoyOtelAls` extension provider in `meshConfig` that emits the `agentshield.*` attributes, and a `Telemetry` resource that turns the provider on for your waypoints. Your collector then forwards the logs to agentshield with an OTLP/HTTP exporter. See [Telemetry](../../concepts/telemetry/).

```yaml
meshConfig:
  extensionProviders:
    - name: agentshield-otel
      envoyOtelAls:
        service: opentelemetry-collector.observability.svc.cluster.local
        port: 4317
        logName: agentshield-istio
        logFormat:
          labels:
            agentshield.telemetry.kind: active-probe
            agentshield.event.id: '%REQ(X-REQUEST-ID)%'
            agentshield.evidence.id: '%REQ(X-REQUEST-ID)%'
            agentshield.subject.k8s.api_version: apps/v1
            agentshield.subject.k8s.kind: Deployment
            agentshield.subject.k8s.namespace: '%FILTER_STATE(downstream_peer_obj:FIELD:namespace)%'
            agentshield.subject.k8s.name: '%FILTER_STATE(downstream_peer_obj:FIELD:workload)%'
            agentshield.object.k8s.api_version: v1
            agentshield.object.k8s.kind: Service
            agentshield.object.k8s.namespace: '%FILTER_STATE(upstream_peer_obj:FIELD:namespace)%'
            agentshield.object.k8s.name: '%FILTER_STATE(upstream_peer_obj:FIELD:service)%'
            agentshield.object.authority: '%REQ(:AUTHORITY)%'
            agentshield.operation: '%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%'
            agentshield.coverage: ambient-waypoint
            agentshield.probe.http_statuses: '%RESPONSE_CODE%'
```

Turn the provider on for a waypoint with a `Telemetry` resource:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: waypoint-access-logs
  namespace: <namespace>
spec:
  targetRefs:
  - {group: gateway.networking.k8s.io, kind: Gateway, name: waypoint}
  accessLogging:
  - providers:
    - {name: agentshield-otel}
```

Restrict who can send to the collector, because anyone who can set `agentshield.telemetry.kind` can route records to this mapper.

### Attributes

Each endpoint needs an API version and kind, plus either a UID or a namespace and name. With a namespace and name, the mapper resolves the UID from its Kubernetes cache. It never guesses, so a record with missing required fields is rejected.

| Attribute | Notes |
| --- | --- |
| `agentshield.telemetry.kind` | Required. Must be `active-probe`. |
| `agentshield.event.id` | Required. Stable across retries. |
| `agentshield.operation` | Required, for example `GET /allowed`. |
| `agentshield.coverage` | Required, for example `ambient-waypoint`. |
| `agentshield.subject.k8s.api_version`, `.kind` | Required. The `.uid` is preferred, otherwise `.namespace` and `.name`. |
| `agentshield.object.k8s.api_version`, `.kind` | Required. The `.uid` is preferred, otherwise `.namespace` and `.name`. |
| `agentshield.object.authority` | Optional. A `<service>.<namespace>.svc.cluster.local[:port]` value resolves the Service when peer metadata lacks it. |
| `agentshield.outcome` | Optional, `allowed` or `denied`. Derived from the HTTP status when absent. |
| `agentshield.probe.http_statuses` | Optional. `403` means `denied`. |
| `agentshield.evidence.id`, `agentshield.count` | Optional. The evidence ID defaults to the event ID and the count to 1. |

### Limitations

- **Only Deployment callers resolve.** Istio peer metadata gives the caller's workload name but not its UID or owner kind, so the example hard-codes `Deployment`. A caller run by a StatefulSet, DaemonSet, Job, or bare Pod does not match, and its record is rejected and counted in the OTLP partial-success response. A sender that supplies a UID can name any kind.
- **Short Service names may not resolve.** When the waypoint's upstream peer metadata does not name the Service, the mapper falls back to `agentshield.object.authority`, which resolves only the fully qualified `<service>.<namespace>.svc.cluster.local[:port]`. A request to a short name such as `http://catalog:8080` is rejected.

## Remediation

`peer-authentication/v1` implements `transport.require-mutual-tls` for a Pod. It labels the Pod with `agentshield.io/remediation-target` and creates a `STRICT` PeerAuthentication that selects the label. An existing PeerAuthentication that selects the Pod is a conflict, and an AuthorizationPolicy is not. The process needs `update` on Pods and `create` on PeerAuthentications. See [Remediation](../../concepts/remediation/).
