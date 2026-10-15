import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { ImageResponse } from "next/og.js";
import { jsx, jsxs } from "react/jsx-runtime";

// Draws one 1200x630 card per blog post into blog/static/og/<post>.png. The blog head partial links
// to og/<post>.png unless a post sets `ogImage`. Colors are the sRGB equivalents of the OKLCH tokens in
// src/app/globals.css, because the renderer cannot parse oklch().
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const postsDirectory = join(root, "blog/content/posts");
const outputDirectory = join(root, "blog/static/og");
const fontDirectory = join(root, "node_modules/@fontsource/bricolage-grotesque/files");

const color = {
  night: "#12012a",
  night3: "#2d1852",
  onNight: "#f3f0f8",
  onNight2: "#c0bacf",
  accent: "#bca8fd",
};

const [regular, extrabold] = await Promise.all([
  readFile(join(fontDirectory, "bricolage-grotesque-latin-500-normal.woff")),
  readFile(join(fontDirectory, "bricolage-grotesque-latin-800-normal.woff")),
]);

const logoSvg = await readFile(join(root, "public/brand/logo-light.svg"));
const logoUrl = `data:image/svg+xml;base64,${logoSvg.toString("base64")}`;

const hugoConfig = await readFile(join(root, "blog/hugo.toml"), "utf8");
const baseURL = /^baseURL\s*=\s*"([^"]+)"/m.exec(hugoConfig)?.[1];
if (!baseURL) throw new Error("blog/hugo.toml has no baseURL");
const { host, pathname } = new URL(baseURL);
const blogAddress = `${host}${pathname.replace(/\/$/, "")}`;

async function findMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = join(directory, entry.name);
      return entry.isDirectory() ? findMarkdownFiles(entryPath) : entryPath;
    }),
  );
  return files.flat().filter((file) => extname(file) === ".md");
}

function firstValue(value, fallback) {
  if (Array.isArray(value)) return String(value[0] ?? fallback);
  return value ? String(value) : fallback;
}

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return "agentshield blog";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function truncate(value, maximum) {
  if (value.length <= maximum) return value;
  return `${value.slice(0, maximum - 1).trimEnd()}…`;
}

function titleSize(title) {
  if (title.length > 88) return 56;
  if (title.length > 62) return 64;
  return 76;
}

function createCard({ category, date, title }) {
  return new ImageResponse(
    jsxs("div", {
      style: {
        display: "flex",
        width: "100%",
        height: "100%",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px 58px",
        color: color.onNight,
        background: color.night,
        fontFamily: "Bricolage Grotesque",
      },
      children: [
        jsxs("div", {
          style: { display: "flex", alignItems: "center" },
          children: [
            jsx("img", { src: logoUrl, width: 286, height: 48, alt: "" }),
            jsx("div", {
              style: {
                display: "flex",
                marginLeft: 20,
                padding: "6px 16px",
                color: color.onNight,
                background: color.night3,
                borderRadius: 999,
                fontSize: 22,
                fontWeight: 500,
              },
              children: "blog",
            }),
          ],
        }),
        jsx("div", {
          style: {
            display: "flex",
            maxWidth: 1040,
            fontSize: titleSize(title),
            fontWeight: 800,
            lineHeight: 1.04,
            letterSpacing: "-0.035em",
          },
          children: truncate(title, 112),
        }),
        jsxs("div", {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: color.onNight2,
            fontSize: 24,
            fontWeight: 500,
          },
          children: [
            jsxs("div", {
              style: { display: "flex", alignItems: "center" },
              children: [
                jsx("span", {
                  style: { display: "flex", color: color.accent, fontWeight: 800 },
                  children: category,
                }),
                jsx("span", { style: { display: "flex", margin: "0 14px" }, children: "·" }),
                date,
              ],
            }),
            blogAddress,
          ],
        }),
      ],
    }),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Bricolage Grotesque", data: regular, weight: 500, style: "normal" },
        { name: "Bricolage Grotesque", data: extrabold, weight: 800, style: "normal" },
      ],
    },
  );
}

const files = (await findMarkdownFiles(postsDirectory)).filter(
  (file) => basename(file) !== "_index.md",
);
const seenNames = new Set();
const posts = await Promise.all(
  files.map(async (file) => {
    const { data } = matter(await readFile(file, "utf8"));
    const name = basename(file, extname(file));
    if (seenNames.has(name)) throw new Error(`Duplicate blog post filename: ${name}`);
    seenNames.add(name);
    if (typeof data.title !== "string" || !data.title.trim()) {
      throw new Error(`Blog post is missing a title: ${file}`);
    }
    if (data.ogImage) return null;
    return {
      category: firstValue(data.categories, "Blog"),
      date: formatDate(data.date),
      name,
      title: data.title.trim(),
    };
  }),
);

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const post of posts.filter(Boolean)) {
  const response = createCard(post);
  const output = join(outputDirectory, `${post.name}.png`);
  await writeFile(output, Buffer.from(await response.arrayBuffer()));
  console.log(`Created ${output.replace(`${root}/`, "")}`);
}
