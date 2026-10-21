---
title: agentgateway
description: How the agentgateway plugin selects Gateways and routes, what it adds to the graph, and the access-log normalizer that has no transport yet.
weight: 4
---

The agentgateway plugin describes [agentgateway](https://agentgateway.dev) instances managed through the Kubernetes Gateway API: which Gateways agentgateway controls, which HTTPRoutes attach to them, and which Services those routes send traffic to. It is early, so expect it to change.

It reads Kubernetes collections, so the Kubernetes plugin watches the Gateway API resources for it.

| Detail | Value |
| --- | --- |
| Role | Semantic plugin |
| Authority | `--agentgateway-cluster-id` |
| Source ID | `--agentgateway-source-id` |
| Contribution | `semantics` |

Set `--agentgateway-cluster-id` and `--agentgateway-source-id` to the Kubernetes plugin's values. See [Kubernetes](../kubernetes/).

## Kubernetes resources requested

| Capability | Resources | Required |
| --- | --- | --- |
| `agentgateway-core-v1` | services | Yes |
| `gateway-api-v1` | `gateway.networking.k8s.io/v1` gatewayclasses, gateways, httproutes | No |

## Selecting Gateways

A Gateway is selected when its GatewayClass has the controller `agentgateway.dev/gatewayclass-controller`. If the GatewayClass object is not observed, a class named `agentgateway` is used as a fallback. An observed GatewayClass always wins, so a class named `agentgateway` with a different controller is excluded together with its Gateways. The controller name and fallback class name have no flags.

## What goes in the graph

The plugin asserts the selected GatewayClasses, Gateways, HTTPRoutes, and referenced Services under their Kubernetes identities, so its facets and edges attach to the same nodes as the Kubernetes inventory.

| Output | Meaning |
| --- | --- |
| `agentgateway-ingress` facet on a selected Gateway | Class source, listeners, addresses, and the `Accepted` and `Programmed` values |
| Gateway `governed-by` GatewayClass | When the class object is observed |
| `agentgateway-route` facet on an attached HTTPRoute | Hostnames and the `Accepted` and `ResolvedRefs` values |
| HTTPRoute `member-of` Gateway | For a same-namespace parent reference |
| `agentgateway-backend` facet on a referenced Service | A route count |
| HTTPRoute `exposes` Service | For a same-namespace backend reference |

Missing status conditions are recorded as `unknown`, not as negative values. The ingress facet carries exposure semantics with gateway scope and `effect=unknown`. A Gateway, its addresses, or `Programmed=True` do not prove external exposure or enforcement.

Cross-namespace backend references are not projected, because ReferenceGrants are not observed. They produce a diagnostic instead.

## Access logs

The plugin can convert one agentgateway access record into a `gateway-request` event. Authenticated requests get an `authenticated/` operation prefix, so rollups record that a request was authenticated without storing the principal. Credentials, headers, bodies, and principal names are dropped.

No transport feeds it yet. The binary has no access-log transport, configuration, or stored cursor, so nothing calls the normalizer today.
