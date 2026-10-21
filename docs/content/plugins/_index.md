---
title: Plugins
description: The plugins in the box, what each reads, and what is planned.
weight: 3
---

A plugin is a Go package for one system. It reads state, takes in telemetry, publishes what it finds into the graph, and can declare the fixes it knows how to apply. If a system can report changes, it can be a plugin. To build one, see [Write a plugin](write-a-plugin/).

## In the box

| Plugin | Discovery | Telemetry | Can apply |
| --- | --- | --- | --- |
| [Kubernetes](kubernetes/) | Yes | No | NetworkPolicy ingress isolation for a Pod or a Service |
| [Istio](istio/) | Yes | Yes | STRICT mutual TLS with PeerAuthentication |
| [Cilium](cilium/) | Yes | Not yet | CiliumNetworkPolicy ingress isolation |
| [agentgateway](agentgateway/) (early) | Yes | Not yet | Nothing |
| [Falco](falco/) (early) | No | Yes | Nothing |
| [AWS](aws/) (early) | Yes | Yes | Nothing |

Cilium and agentgateway have normalizers for Hubble flows and access logs, but no transport feeds them yet.

### Kubernetes

Owns API discovery and one shared informer per resource type, covering workloads, services, RBAC, and admission configuration. It publishes one collection per type and reuses it for every plugin that asks. Secrets arrive as object metadata and a sorted list of key names. Values, type, and annotations are excluded. See [Kubernetes](kubernetes/).

### Istio

Models AuthorizationPolicy, PeerAuthentication, ambient enrollment, waypoints, ServiceEntry, and VirtualService on top of the Kubernetes plugin's watches. It maps waypoint OTLP access logs into bounded communication rollups, which needs a custom access-log provider. ServiceEntry endpoint values stay out of the graph, and only counts and address classes are kept. See [Istio](istio/).

### Cilium

Reads CiliumNetworkPolicy, CiliumClusterwideNetworkPolicy, CiliumEndpoint, and CiliumNode, and enriches the matching Pods and Nodes instead of creating rival identities. It covers CNI state only. Service mesh, Envoy, and L7 policy are out of scope, and L7 sections are diagnosed and omitted. See [Cilium](cilium/).

### agentgateway

Early. Expect it to change. It projects GatewayClass, Gateway, HTTPRoute, and the Services they reference for agentgateway instances managed through Gateway API.

- Cross-namespace backends are omitted because ReferenceGrant coverage is missing.

See [agentgateway](agentgateway/).

### Falco

Early. It maps Falco interactive-shell alerts that your OpenTelemetry Collector forwards, so a Pod that opens a shell gains an `executes` edge to the `shell` process class, and a [detection rule](../concepts/rules/) can match on it. It reads no provider API. See [Falco](falco/).

### AWS

Early. It inventories EC2 instances, network interfaces, and security groups in one region and takes VPC Flow Logs straight from Amazon Data Firehose. It uses the default AWS credential chain and needs no Kubernetes cluster. It does not model routing, gateways, network ACLs, or IAM, and it has no actions to apply. See [AWS](aws/).

## Planned

None of these are in this release.

| Plugin | Purpose |
| --- | --- |
| Tetragon | Runtime events from eBPF |

The graph does not model permissions, reachability derived from network policy, or secret access as edges yet.
