// Captures the finding view and the approval dialog from the product's Storybook demo environment and
// writes them to public/images/product as 960px-wide WebP files with rounded corners.
//
// Usage: PRODUCT_UI=/path/to/product/ui [STORYBOOK_URL=http://127.0.0.1:6006] npm run capture:product
// Requires the product's Storybook to be running (`pnpm storybook` in its ui directory). If the
// printed sizes change, update the width and height in src/app/_components/home/Findings.tsx.
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const productUi = process.env.PRODUCT_UI;
if (!productUi) throw new Error("Set PRODUCT_UI to the product repository's ui directory.");
const storybook = process.env.STORYBOOK_URL ?? "http://127.0.0.1:6006";

const { chromium } = createRequire(path.join(productUi, "package.json"))("playwright");
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../public/images/product");
await mkdir(outDir, { recursive: true });

const scale = 2;
const outputWidth = 960;

const mask = (width, height, radius) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
  );

async function round(png, name, radius) {
  const { width, height } = await sharp(png).metadata();
  // Sharp applies composite() after resize(), so round the corners at full size first.
  const rounded = await sharp(png)
    .ensureAlpha()
    .composite([{ input: mask(width, height, radius), blend: "dest-in" }])
    .png()
    .toBuffer();
  const info = await sharp(rounded)
    .resize({ width: outputWidth })
    .webp({ quality: 88, alphaQuality: 100 })
    .toFile(path.join(outDir, `${name}.webp`));
  console.log(`wrote ${name}.webp ${info.width}x${info.height}`);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 2100 },
  deviceScaleFactor: scale,
  reducedMotion: "reduce",
});
const page = await context.newPage();
await page.goto(`${storybook}/iframe.html?id=app--finding-with-remediations&viewMode=story`, {
  waitUntil: "load",
});
await page.waitForSelector(".remediation-item", { timeout: 15000 });
await page.waitForSelector("text=Graph synchronized", { timeout: 15000 });
// Hide the sticky top bar and the page chrome so only the content is captured.
await page.addStyleTag({
  content:
    ".topbar{display:none!important} html,body{background:transparent!important} dialog::backdrop{background:transparent!important;backdrop-filter:none!important}",
});
await page.waitForTimeout(1200);

const detail = await page.locator(".finding-detail").boundingBox();
const first = await page.locator(".remediation-item").first().boundingBox();
const clip = {
  x: detail.x + 6,
  y: detail.y + 20,
  width: detail.width - 12,
  height: first.y + first.height - detail.y - 20 + 32,
};
await round(await page.screenshot({ clip }), "finding", 14 * scale);

await page.getByRole("button", { name: "Prepare" }).first().click();
await page.waitForSelector("dialog[open]", { timeout: 15000 });
// Hide the page behind the dialog so none of it shows through at the rounded corners.
await page.addStyleTag({
  content:
    "body *{visibility:hidden!important} dialog[open],dialog[open] *{visibility:visible!important}",
});
await page.waitForTimeout(800);
await round(
  await page.locator("dialog[open] .approval-sheet").screenshot({ omitBackground: true }),
  "approval",
  15 * scale,
);

await browser.close();
