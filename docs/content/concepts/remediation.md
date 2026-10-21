---
title: Remediation
description: How a finding turns into a fix you approve, what each plugin can apply, and what verification proves.
weight: 7
---

An investigation attaches desired outcomes to a finding. It never picks a provider and it never applies anything. Plugins declare the actions they can take. You choose one, review the prepared change, and approve it.

## From finding to action

A promoted finding from an investigation can carry up to eight distinct remediation suggestions. Each names a desired outcome and one affected target, not a plugin implementation, and all of them stay on the finding so you can compare them. The service turns each suggestion into a proposal tied to that finding and target. A finding from a rule match carries no suggestions, so it has nothing to remediate.

Plugins advertise the actions they can perform for an outcome and target. The explorer lists every action that is live right now, including alternatives from different plugins or configured clusters, and you choose one before anything is prepared. The API never accepts a proposal from the browser.

## Lifecycle

1. **Plan.** Resolve current provider state and build the deterministic desired-state content.
2. **Prepare.** Run an admission dry run for every intended write, record the fields the action controls, and keep a bounded canonical copy in process memory. The explorer shows you the prepared change.
3. **Approve.** A separate approval submits the plan ID. Execution re-reads the target, writes, and attempts to roll back a new pod label if the policy write or the recheck after the label write fails.
4. **Verify.** Re-read the controlled declarations and compare them with the execution result.

Nothing is written before approval. Choosing an action, planning, and preparing never authorize a write. Prepared actions do not expire on a timer.

## Staleness

A finding is a durable record of what reasoning observed, so later graph changes do not erase it. Its graph digest is audit context, not an execution lock, and unrelated graph changes do not block a remediation.

Applicability is checked again at plan, prepare, and execute time against current state. A remediation stops if the target is gone, its kind changed, or provider state no longer matches what was prepared. The explorer shows that failure on the remediation and keeps the finding for review.

A finding that a later change has invalidated stays readable for audit but cannot launch a remediation. The API answers with a conflict.

## What each plugin can apply

| Outcome | Plugin | Action | Target | Writes |
| --- | --- | --- | --- | --- |
| `network.declare-ingress-isolation` | Kubernetes | `network-policy/v1` | Pod | A pod label and an ingress-isolating NetworkPolicy |
| `network.declare-ingress-isolation` | Kubernetes | `service-network-policy/v1` | Service | An ingress-isolating NetworkPolicy for the Pods the Service selects, with no label |
| `network.declare-ingress-isolation` | Cilium | `cilium-network-policy/v1` | Pod | A pod label and an ingress-isolating CiliumNetworkPolicy |
| `transport.require-mutual-tls` | Istio | `peer-authentication/v1` | Pod | A pod label and a STRICT PeerAuthentication |

`gateway.prevent-route-delivery` is a third outcome that reasoning can suggest. No shipped plugin implements it yet, so there is no action to run for it. The AWS plugin has no actions either.

Providers and sources can overlap, so you select the provider, source, and action explicitly.

## Overlap checks

Kubernetes, Istio, and Cilium each scan the policy surface their action could collide with, using the pod labels the change would add, and scan again after the live label write. Cilium covers Kubernetes NetworkPolicy, CiliumNetworkPolicy, and CiliumClusterwideNetworkPolicy. Istio checks PeerAuthentication, because that is the resource that selects a workload's transport mode. An AuthorizationPolicy on the same workload is not a conflict.

Malformed selectors and failed list calls fail closed. A policy that already has the deterministic name is reused only when its target metadata and controlled content match the desired declaration exactly. Anything else is a collision. The Kubernetes Service action also rejects a Service without a selector, and any selected Pod that another ingress policy already covers.

## What verification proves

Verification confirms that the declared policy and the label are present. It does not prove that the controller accepted them, that the datapath rolled out, that traffic is blocked, or that anything is encrypted. Treat it as proof of declaration, not of enforcement.

## HTTP API

All three endpoints belong to a finding and one of its proposals.

| Method and path | Purpose |
| --- | --- |
| `GET /api/v1/findings/{findingID}/remediations/{proposalID}/candidates` | List the provider, source, and action candidates that are live now. |
| `POST /api/v1/findings/{findingID}/remediations/{proposalID}/prepare` | Plan the chosen action and run the dry run. The body names `providerId`, `sourceId`, and `actionId`. |
| `POST /api/v1/findings/{findingID}/remediations/{proposalID}/approve` | Execute the prepared plan and verify the result. The body carries the `planId`. |

Request bodies are JSON, limited to 64 KiB, and reject unknown fields. An invalidated finding returns a conflict, and an unknown proposal returns not found. Approving a plan again returns the stored result instead of writing twice. A verification that is not satisfied is reported as an error.

## Operational boundary

The remediation endpoints answer only when the service has live discovery and a loopback listener. On any other setup, including `--disable-discovery`, findings and graph data stay readable and the three endpoints report that live remediation is unavailable.

Prepared actions and approvals live in process memory. After a restart, prepare again. The process needs RBAC permission to write NetworkPolicies, CiliumNetworkPolicies, PeerAuthentications, and Pod labels for these actions to succeed. A production deployment would need authentication, a durable approval audit, CSRF protection, cleanup, and coordination, none of which exist yet. Provider credentials and permissions stay host configuration and never enter a suggestion or a proposal.

For the full contract, see the [remediation reference](/docs/architecture/remediation/).
