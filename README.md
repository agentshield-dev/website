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

This repository is the source of truth for product documentation. The product repository links to these pages at `https://agent-shield.dev/docs/`; update documentation here when product behavior changes. The site keeps canonical references for overlapping guides and redirects their previous URLs. Keep a topic's contract or procedure in one page and link to it from overviews and related guides.

Mermaid code fences render as diagrams using the locally installed `mermaid` package, bundled by Hugo only on pages that contain diagrams. Run `npm ci` before building the docs. Screenshots imported from the product live in `docs/static/images/`.

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
