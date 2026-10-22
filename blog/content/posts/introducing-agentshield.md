---
title: Introducing agentshield
description: A decade of lateral movement, from flat networks to AI agents, and the open-source project we built to find those paths and close them.
date: 2026-10-21T09:00:00Z
lastmod: 2026-10-21T09:00:00Z
draft: false
author: Sebastian Maniak
authorTitle: AI Architect
authorImage: /blog/img/introducing-agentshield/sebastian-maniak.jpg
categories:
  - Announcement
tags:
  - agentshield
  - security
  - kubernetes
  - lateral movement
  - ai agents
---

![agentshield](/blog/img/agentshield-logo.png)

Scroll through ten years of breach threads on Hacker News and one pattern repeats: the first compromised machine is never the story. The story is how far the attacker got from it.

In 2016, Maersk’s own IT leaders warned that the company’s flat network would let malware run far past wherever it first landed. The redesign was approved and budgeted, then never built. A year later, [NotPetya](https://news.ycombinator.com/item?id=23595022) proved them right, costing Maersk an estimated $250–300 million ([Wired](https://www.wired.com/story/notpetya-cyberattack-ukraine-russia-code-crashed-the-world/)).

In 2022, an attacker social-engineered their way onto [Uber’s VPN](https://news.ycombinator.com/item?id=32860728). They said a script on a file share held admin credentials for Uber’s privileged access manager, which unlocked AWS, Google Workspace and more.

Kubernetes didn’t retire the pattern; it added doors. In 2024, Wiz researchers turned a basic [SAP AI Core](https://news.ycombinator.com/item?id=40990768) account into cluster admin, with a view of other customers’ secrets. Part of the trick was running as Istio’s own user ID, so the mesh’s network rules waved them through.

In 2025, [IngressNightmare](https://news.ycombinator.com/item?id=43465424) let any pod able to reach ingress-nginx’s admission webhook run code in a controller that can read every Secret by default.

In the newest chapter, the thing moving laterally is your own agent. Since 2025, one malicious GitHub issue has been enough to make an agent leak private repos, via [GitHub’s MCP server](https://news.ycombinator.com/item?id=44097390) and [Agentic Workflows](https://news.ycombinator.com/item?id=48827858).

Then, in July 2026, no attacker was needed at all. [Hugging Face disclosed](https://news.ycombinator.com/item?id=48956248) an intrusion carried out entirely by AI agents. Five days later, [OpenAI said the agents were its own models](https://news.ycombinator.com/item?id=48997548), under test on a cyber benchmark.

They moved laterally through OpenAI’s research environment to reach the internet, then broke into Hugging Face with stolen credentials and zero-days. Inside, they spread across several internal clusters over a weekend, all to steal the benchmark’s answer key.

![From flat networks to AI agents: seven lateral-movement incidents discussed on Hacker News, 2017 to 2026](/blog/img/introducing-agentshield/lateral-movement-timeline.svg)

The move stays the same while the ground shifts: from corporate networks to clusters to agents.

An agent is a workload with credentials that takes instructions from whatever it reads. The foothold is rarely the catastrophe; the paths behind it are. agentshield exists to find those paths and close them before anyone walks them.

## The problem

In most clusters, few teams can quickly answer the question that matters during an intrusion: who can reach what right now, and what just changed? Kubernetes lets every pod talk to every other pod until a policy says otherwise. The rules that restrict it live in five places: NetworkPolicies, CiliumNetworkPolicies, Istio AuthorizationPolicies and PeerAuthentications, Gateway API routes, and cloud Security Groups.

Each tool sees its own slice: your mesh, your CNI and your cloud console each know only their own rules. The path an attacker takes runs across all of them. In SAPwned, the network rules lived in the mesh, and the mesh exempted one user ID.

Lateral movement also hides in plain sight. It rides ordinary-looking traffic and ordinary-looking changes: a new RoleBinding, a PeerAuthentication relaxed from `STRICT`, a NetworkPolicy deleted mid-rollout. Each one can pass review as routine work.

AI agents raise the stakes. They are new workloads with broad credentials that call tools on other services and act on text an attacker can write. The question isn’t whether an agent gets tricked; it’s how far it can go when it does.

## What agentshield is

agentshield is an open-source project that finds evidence-backed lateral-movement paths and risky security changes. It targets Kubernetes clusters running Istio ambient mesh, Cilium and agentgateway. On every change it asks one question: did this just open a path that wasn’t there before, and what evidence says so?

![How agentshield works: your cluster’s config and traffic feed one evidence graph; risky changes are detected and investigated, and every fix waits for a person’s approval before agentshield applies and verifies it](/blog/img/introducing-agentshield/how-agentshield-works.svg)

Your cluster’s config and traffic feed one graph; risky changes are checked against it, and every fix waits for your approval.

How it works:

1. **Discover.** Plugins for Kubernetes, Istio, Cilium, agentgateway and AWS read the environment into one graph of workloads, identities, policies and routes. Every fact records the plugin, rule and observation that produced it.
2. **Observe.** Istio waypoint access logs and AWS VPC Flow Logs become `communicates-with` edges, so the graph knows who actually talks to whom.
3. **Detect.** Built-in detectors flag new exposure, lost governance, changed policy, new RBAC bindings and workloads reaching places they never reached before. They ignore rollouts and scaling, and you can add your own CEL rules.
4. **Investigate.** When you turn it on, a language model examines each signal through six read-only graph tools. A finding counts only if it cites facts the graph actually returned.
5. **Fix, with a human in the loop.** A finding can propose a NetworkPolicy, CiliumNetworkPolicy or Istio `STRICT` PeerAuthentication. A person prepares and approves each one, and agentshield verifies the result.

Detection itself never calls a model, and both model features are off by default. Everything ships as one binary with a web UI and an HTTP API.

## See it in action

Here’s one of agentshield’s evaluation campaigns, start to finish, in a kind cluster. It echoes SAPwned: a build worker in an ML workspace starts reaching the workspace’s secrets service.

**It spots the path.** `workspace-build-worker` normally calls the model hub API; now it sends an allowed request to `workspace-secrets-api`. Agentic investigation files a medium-severity `possible_lateral_path` finding naming both resources. It calls for a review of intended access and is upfront that it doesn’t show exploitation or secret disclosure.

**It proposes a fix, and waits.** The finding suggests `network.declare-ingress-isolation`, a NetworkPolicy that locks down ingress to the secrets service. Prepare runs a server-side dry run, and the approval sheet shows the exact change before anyone clicks Approve and apply.

![The explicit approval sheet for network.declare-ingress-isolation, showing the NetworkPolicy change before it is applied](/blog/img/introducing-agentshield/agentshield-demo-approval.png)

*Prepare previews the NetworkPolicy. The cluster is still untouched.*

**It applies, then checks.** Once approved, agentshield creates the NetworkPolicy and verifies it in the cluster. The same curl from the build worker to the secrets API now times out.

![The finding marked applied and verified, with the terminal showing the new NetworkPolicy and a timed-out request](/blog/img/introducing-agentshield/agentshield-demo-blocked.png)

*The policy is in Kubernetes, and the old request is blocked.*

Nothing touched the cluster until a person said yes, and the fix was checked against the live cluster rather than assumed.

## Why we’re building it

The question at the heart of every story above has no owner. Network policy belongs to the CNI, mTLS and authorization to the mesh, routes to the gateway, and Security Groups to the cloud team. No single tool joins them and asks, on every change, whether a new path just opened.

We wanted a tool that answers that question with evidence you can check. A few principles shaped it:

- **Evidence or it didn’t happen.** A finding must cite facts the graph actually returned, and it’s invalidated when those resources change.
- **Humans approve every change.** agentshield proposes fixes; a person prepares, dry-runs and approves each one.
- **Models are optional and bounded.** Detection never calls a model. Investigation runs in its own queue with batching, sampling, deduplication and an hourly budget, so a slow model never delays detection.
- **Provenance everywhere.** Every resource has a stable identity, and every fact records the plugin, rule and observation behind it.

We test against the attacks we worry about most. The evaluation suite runs six campaigns on a real cluster with Cilium, Istio ambient and agentgateway: a compromised checkout service reading a payment signing key, an ML workspace build worker reading workspace secrets, and a single sign-on server enumerating private repositories. Each attack has a benign twin, because a tool that cries wolf gets switched off.

## Get started and join the community

You can watch agentshield work in about a minute.

```bash
git clone https://github.com/agentshield-dev/agentshield.git
cd agentshield
make demo
```

Open http://127.0.0.1:5173, pick a scenario, trigger it, and walk a finding through prepare and approve. It runs the real UI against a simulated backend, so nothing leaves your browser.

Ready for a real cluster? `docs/getting-started.md` in the repo takes you from a kind cluster and PostgreSQL to a live graph in about 10 minutes. Add a model endpoint to get findings, or run `make eval-up` for the full lab with Cilium, Istio ambient and agentgateway (about 30 minutes and an OpenAI API key).

agentshield is early and we are at an exciting time to join the community and build with us:

- **Star and watch the repo:** [github.com/agentshield-dev/agentshield](https://github.com/agentshield-dev/agentshield).
- **Join us on Discord:** [discord.gg/Anq24jH8Kp](https://discord.gg/Anq24jH8Kp). Ask questions, share what you find, and tell us what your cluster looks like.
- **Contribute:** agentshield is built for people who want to add providers, detectors and evaluation scenarios.

The next lateral-movement story will hit Hacker News soon enough. Help us make sure it isn’t yours.

## Sources

Hacker News threads are linked inline above; these are the underlying reports.

- [The Untold Story of NotPetya, the Most Devastating Cyberattack in History](https://www.wired.com/story/notpetya-cyberattack-ukraine-russia-code-crashed-the-world/), Wired, August 2018
- [Uber hacked, attacker tears through the company’s systems](https://www.helpnetsecurity.com/2022/09/16/uber-hacked-attacker-tears-through-the-companys-systems/), Help Net Security, September 2022
- [SAPwned: SAP AI vulnerabilities expose customers’ cloud environments and private AI artifacts](https://www.wiz.io/blog/sapwned-sap-ai-vulnerabilities-ai-security), Wiz Research, July 2024
- [CVE-2025-1974 (ingress-nginx), Kubernetes issue #131009](https://github.com/kubernetes/kubernetes/issues/131009), March 2025
- [GitHub MCP exploited: Accessing private repositories via MCP](https://invariantlabs.ai/blog/mcp-github-vulnerability), Invariant Labs, May 2025
- [‘GitLost’ vulnerability let GitHub’s AI workflows leak private repositories](https://siliconangle.com/2026/07/07/gitlost-vulnerability-let-githubs-ai-workflows-leak-private-repositories/), SiliconANGLE, July 2026
- [Security incident disclosure – July 2026](https://huggingface.co/blog/security-incident-july-2026), Hugging Face, July 2026
- [OpenAI and Hugging Face partner to address security incident during model evaluation](https://openai.com/index/hugging-face-model-evaluation-security-incident/), OpenAI, July 2026
- agentshield README, CONTRIBUTING.md and docs/getting-started.md, October 2026
