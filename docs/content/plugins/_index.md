---
title: Plugins
description: The plugins in the box, what each reads, and what is planned.
weight: 3
---

A plugin is a Go package for one system. It reads state, takes in telemetry, publishes what it finds into the graph, and can declare the fixes it knows how to apply. If a system can report changes, it can be a plugin. To build one, see [Write a plugin](write-a-plugin/).

## In the box

| Plugin | Discovery | Telemetry | Can apply |
| --- | --- | --- | --- |
| Kubernetes | Yes | No | NetworkPolicy ingress isolation |
| Istio | Yes | Yes | STRICT mutual TLS with PeerAuthentication |
| Cilium | Yes | Yes | CiliumNetworkPolicy ingress isolation |
| agentgateway (early) | Yes | Yes | Nothing |
| [AWS](aws/) (early) | Yes | Yes | Nothing |

### Kubernetes

Owns API discovery and a single shared informer factory. It publishes one collection per resource type, such as pods or services, and reuses it for every plugin that asks. Secrets arrive as object metadata and a sorted list of key names. Values, type, and annotations are excluded.

### Istio

Models PeerAuthentication, AuthorizationPolicy, and ServiceEntry on top of the Kubernetes plugin's watches. It maps waypoint OTLP access logs into bounded communication rollups. ServiceEntry endpoint values stay out of the graph, and only counts and address classes are kept.

### Cilium

Reads CiliumNetworkPolicy, CiliumClusterwideNetworkPolicy, CiliumEndpoint, and CiliumNode, and enriches the matching pods and nodes instead of creating rival identities. It normalizes Hubble network flows. It covers CNI state and flows only. Service mesh, Envoy, and L7 policy are out of scope, and L7 sections are diagnosed and omitted.

### agentgateway

Early. Expect it to change. It projects GatewayClass, Gateway, HTTPRoute, and the Services they reference for agentgateway instances managed through Gateway API, and maps agentgateway access logs.

- Cross-namespace backends are omitted because ReferenceGrant coverage is missing.
- The Kubernetes source does not watch GatewayClass yet, so the plugin falls back to configured class names.

### AWS

Early. It inventories EC2 instances, network interfaces, and security groups in one region and takes VPC Flow Logs straight from Amazon Data Firehose. It uses the default AWS credential chain and needs no Kubernetes cluster. It does not model routing, gateways, network ACLs, or IAM, and it has no actions to apply. See [AWS](aws/).

## Planned

None of these are in this release.

| Plugin | Purpose |
| --- | --- |
| Tetragon | Runtime events from eBPF |
| Falco | Runtime detections |

The graph does not model permissions, reachability derived from network policy, or secret access as edges yet.
