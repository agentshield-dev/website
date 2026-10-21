# agentshield website

This repository contains the public website, documentation, and blog for [agentshield](https://github.com/agentshield-dev/agentshield).

## About agentshield

Agentshield is open source defense against lateral movement across Kubernetes and AWS. It keeps a graph of what exists and what is allowed, takes in telemetry for what actually happens, and detects what is new with built-in checks, detection rules, and a model investigator. A finding cites the facts and evidence behind it, and a fix is applied only after a person approves it. Plugins for Kubernetes, Istio, Cilium, agentgateway, Falco, and AWS ship in the box.

## Repository layout

| Path | Contents |
| --- | --- |
| `src/app/` | Next.js marketing site served at `/` |
| `docs/` | Hugo documentation served at `/docs/` |
| `blog/` | Hugo blog served at `/blog/` |
| `public/` | Shared fonts, logo files, and product screenshots, plus Cloudflare Pages headers |
| `scripts/` | Blog social-card generator and the product screenshot capture script |

The marketing site, docs, and blog share one set of design tokens, anchored on the logo's purple (`#7b33ea`) and deep violet (`#12012a`), and the same font files in `public/fonts/`. The tokens live in `src/app/globals.css`, `docs/assets/css/docs.css`, and `blog/assets/css/blog.css`, so change them in all three. The logo files in `public/brand/` are the official artwork with the artboard cropped to the artwork, and the docs and blog mount them from there.

## Local development

Install Node.js, npm, and [Hugo Extended](https://gohugo.io/installation/), then install the locked dependencies:

```bash
npm ci
```

Run the marketing, documentation, and blog servers in separate terminals:

```bash
npm run dev       # http://localhost:3000
npm run dev:docs  # http://localhost:1313/docs/
npm run dev:blog  # http://localhost:1314/blog/
```

Next.js proxies `/docs/*` and `/blog/*` to their Hugo servers during local development, so the combined site is available at [http://localhost:3000](http://localhost:3000).

## Writing docs

Docs are Markdown in `docs/content/`. Sections are folders with an `_index.md`, and `weight` in the front matter orders the sidebar and the previous and next links. A `callout` shortcode is available for notes. Docs describe what the product does today, so check a claim against the product repository before adding it.

The product documentation was imported from `agentshield/docs/` on `main` at commit `946c6a3` on 2026-10-21, including its screenshots. Overlapping concept and plugin guides have been consolidated into canonical references; their old URLs redirect to the owning pages. Setup workflows and the HTTP API catalog each have one owning page. Internal documentation links stay on this site; source-code links point to the product repository.

This repository is the source of truth for authored product documentation. Update it here when product behavior changes; prose is not synchronized from the source repository. Code-backed reference pages are refreshed separately by the workflow below. Keep a topic's contract or procedure in one page and link to it from overviews and related guides.

Mermaid code fences render as diagrams using the locally installed `mermaid` package, bundled by Hugo only on pages that contain diagrams. Run `npm ci` before building the docs. Screenshots imported from the product live in `docs/static/images/`.

## Generated reference docs

The `Update Reference Documentation` workflow in `.github/workflows/update-ref-docs.yaml`
generates code-backed pages from
`agentshield-dev/agentshield`: CEL, graph and telemetry catalogs, CLI flags,
environment lookups, HTTP routes and JSON types, Helm values, MCP tool schemas,
and Go package API pages. The routing step puts `plugins-*.md` package pages in
`docs/content/plugins/` without the `plugins-` prefix, replacing the corresponding
provider pages. For example, `go/plugins-kubernetes.md` becomes `plugins/kubernetes.md`.
Internal `plugins/*/api` packages are excluded: `go/plugins-*-api.md` pages are
not published, and previously generated copies are removed on refresh.
Other references stay in `docs/content/reference/`. The Go package index links
to the plugin section rather than listing duplicate plugin pages. Existing
provider titles, sidebar order, and aliases are retained; old generated URLs
redirect to the plugin pages.

Authored architecture, installation, security, plugin contract, style guide,
tutorial, and plugin-writing pages remain separate and are never overwritten.
Providers without generated output, such as Falco, also remain authored. To
change a generated provider page, update its package comments in the source
repository and regenerate. CLI defaults are
source expressions; the HTTP reference is not an inferred OpenAPI contract.

### Update through GitHub Actions

After the workflow is merged into this repository's default branch, open
**Actions > Update Reference Documentation > Run workflow** and set `source_ref`
to an AgentShield release tag or full commit SHA. The selected revision must
contain `cmd/agentshield-docs` and the `docs-reference` Make target; older releases
do not. For the first run, use the source commit that introduces the exporter.
The source repository is `agentshield-dev/agentshield`.

With the GitHub CLI authenticated, the same operation is:

```bash
gh workflow run update-ref-docs.yaml --repo agentshield-dev/website -f source_ref=SOURCE_TAG_OR_SHA
```

The workflow checks out the website's `main` and the requested source revision,
tests the exporter, generates the reference section, and builds the Hugo docs. It opens or
updates one PR on `docs/update-reference`, recording the resolved source SHA.
Only `docs/content/reference/` and `docs/content/plugins/` are included. Runs are serialized so they
cannot update that branch concurrently; rerunning with identical output opens
no new PR. Review and merge normally; the existing deployment workflow publishes
the committed pages. Normal builds do not fetch source code or require Go.

Enable **Settings > Actions > General > Workflow permissions > Allow GitHub
Actions to create and approve pull requests**. The workflow requests
`contents: write` and `pull-requests: write` and uses this website repository's
`GITHUB_TOKEN`; no personal access token or cross-repository write credentials
are needed. Organization policy must allow these permissions. PRs created with
`GITHUB_TOKEN` generally do not trigger ordinary PR workflows, so this workflow
runs exporter tests and the docs build before creating the PR. It does not merge
or approve PRs automatically, and there is no schedule advancing docs past a
deliberately selected version.

### Update locally

With a sibling AgentShield checkout and its required Go toolchain, run from
this website repository:

```bash
reference_output="$(mktemp -d)"
make -C ../agentshield docs-reference DOCS_OUT="$reference_output"
npm run import:reference -- --source "$reference_output"
npm run build:docs
```

Local generation includes uncommitted source changes. Review the pages and open
a normal website PR, noting the source revision used. Keep the generated
`.agentshield-docs.json` manifests in both `reference/` and `plugins/` with the
pages: they enable safe removal of obsolete generator-owned files without
removing authored guides. Imports refuse authored-file collisions by default.
The initial migration explicitly replaced existing provider pages; subsequent
refreshes do not need `--replace-authored-plugins`. Never use that migration
option for routine updates. Regenerate pages instead of editing them, and link
from authored guides to `/docs/plugins/` or the relevant reference page.

Run `npm run test:reference-import` to check routing, ownership protection,
obsolete-page cleanup, and repeatable output.

## Writing blog posts

Create a draft blog post with:

```bash
npm run new:post -- posts/my-post.md
```

Posts live in `blog/content/posts/`. Set `draft: false` when a post is ready to publish. Use categories for broad sections and tags for specific topics; both generate archive pages and RSS feeds.

The newest published post in the `Announcement` category automatically appears as a link above the headline on the marketing homepage. Drafts and future-dated posts are ignored.

Blog builds generate a branded `1200x630` Open Graph card under `/blog/og/` for every post. Set `ogImage` and `ogImageAlt` in a post's front matter to use a custom social image instead. The launch post, `blog/content/posts/introducing-agentshield.md`, is a draft.

## Product screenshots

The home page shows two screenshots from the product's Storybook demo environment, stored as WebP in `public/images/product/`. Start Storybook with `pnpm storybook` in the product's `ui` directory, then refresh them:

```bash
PRODUCT_UI=<path to the product's ui directory> npm run capture:product
```

If the printed sizes change, update the dimensions in `src/app/_components/home/Findings.tsx`.

## Deployment

Pushes to `main` build and deploy to Cloudflare Pages through `.github/workflows/publish.yml`. The workflow needs the `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` repository secrets. Create the Pages project once:

```bash
npx wrangler pages project create agentshield-website --production-branch main
```

`npm run build:cloudflare` produces the deployable `out/` directory: the Next.js static export at the root, the docs in `out/docs/`, and the blog in `out/blog/`. `npm run preview:cloudflare` builds and serves it locally, and `npm run deploy:cloudflare` deploys from your machine.

## Validation

Run the full validation suite before opening a pull request:

```bash
npm run check
```

This runs ESLint, builds the Next.js site, and builds the Hugo documentation and blog.
