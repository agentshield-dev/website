// One place for links, copy, and the public URL. When the domain is chosen, update `url` here and
// `baseURL` in docs/hugo.toml and blog/hugo.toml.
const repo = "https://github.com/agentshield-dev/agentshield";

export const siteConfig = {
  name: "agentshield",
  title: "agentshield | Assume every attacker is an agent",
  tagline: "Assume every attacker is an agent.",
  description:
    "Open source defense against lateral movement across Kubernetes and AWS. Agentshield maps how your workloads really talk, investigates change with evidence, and proposes fixes you approve.",
  url: "https://agentshield.example",
  githubUrl: repo,
  locale: "en_US",
  language: "en-US",
  links: {
    repo,
    issues: `${repo}/issues`,
    docs: "/docs/",
    blog: "/blog/",
    quickstart: "/docs/getting-started/",
    demo: "/docs/getting-started/try-the-demo/",
    reasoning: "/docs/concepts/reasoning/",
    rules: "/docs/concepts/rules/",
    remediation: "/docs/concepts/remediation/",
    pluginGuide: "/docs/plugins/write-a-plugin/",
    evals: "/docs/operations/evals/",
    lifeOfAPlugin: `${repo}/blob/main/docs/plugins/tutorial.md`,
  },
  nav: [
    { label: "How it works", href: "/how-it-works/" },
    { label: "Plugins", href: "/plugins/" },
    { label: "Docs", href: "/docs/" },
    { label: "Blog", href: "/blog/" },
  ],
} as const;

// Commands from the product README.
export const quickstart = [
  "export POSTGRES_PASSWORD='development-only-password'",
  "make postgres-up",
  'export AGENTSHIELD_DATABASE_URL="postgres://agentshield:${POSTGRES_PASSWORD}@127.0.0.1:5432/agentshield?sslmode=disable"',
  "make run",
] as const;

// Setting the endpoint alone enables nothing: the investigation flag turns the model on.
export const modelSteps = [
  "export AGENTSHIELD_MODEL_ENDPOINT='https://api.openai.com'",
  "export OPENAI_API_KEY='<your key>'",
  "export AGENTSHIELD_AGENTIC_INVESTIGATION=true",
] as const;
