---
title: Repository publication checklist
description: Maintainer checks for publishing or migrating the AgentShield repository.
weight: 20
---

This checklist covers repository publication and release readiness. It is for maintainers; a repository transfer does not transfer copyright or change the Go module path.

## Before making the repository public

- Confirm authorization to publish the code, documentation, images, and demo video, including third-party redistribution and attribution requirements. Keep the Apache 2.0 license and existing copyright attribution intact.
- Review all history and refs that will be published, including branches, tags, Git LFS objects, releases, attachments, and CI artifacts, for secrets, customer data, internal endpoints, and material not cleared for release. Rotate exposed credentials before publication; deleting a file does not revoke them.
- Choose between transferring the existing repository and publishing a reviewed snapshot. Transfer only after reviewing its history; a snapshot must preserve required license and attribution notices.
- Keep runtime data, kubeconfigs, database URLs, model keys, telemetry, and evaluation output out of Git and release assets.

## Configure the destination

- Verify that the people listed in [CODEOWNERS](https://github.com/agentshield-dev/agentshield/blob/main/.github/CODEOWNERS) can access the destination; update ownership when a project team is established.
- Configure branch protection or rulesets and required checks against the destination workflows. Confirm public fork pull requests can run CI without organization-only runners, credentials, or dependencies.
- Enable private vulnerability reporting and verify the reporting link in [SECURITY.md](https://github.com/agentshield-dev/agentshield/blob/main/SECURITY.md).
- Enable available dependency, secret-scanning, and push-protection features. Review Actions permissions, environments, secrets, webhooks, installed apps, and deployment integrations; do not copy organization credentials blindly.
- Update contributor remotes to the destination. Do not rely on GitHub redirects for module imports or release-signature verification.

## Validate and release

- Run the checks in [Testing](/docs/development/testing/), including `make test` and `make lint`. Verify the UI and disposable integration suites in CI.
- Verify `make build UI=0 VERSION=migration-check COMMIT=migration-check` and `./agentshield --version` report the supplied version and commit. The Dockerfile and GoReleaser must use the same module path for linker variables.
- Run a GoReleaser snapshot using the prerequisites in [`.goreleaser.yaml`](https://github.com/agentshield-dev/agentshield/blob/main/.goreleaser.yaml) before tagging a release. Confirm archives contain the license, SBOMs, and checksum signatures.
- Verify a destination release's signatures against the destination workflow identity. Historical releases retain the identity of the workflow that signed them; moving the repository does not re-sign artifacts.
- Check clone instructions, issue and security-report links, release downloads, and contributor access from an account without source-organization access.

These are maintainer publication gates, not evidence that history review, legal review, destination settings, or release checks have already passed.