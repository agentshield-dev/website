import localFont from "next/font/local";

// The same woff2 files in public/fonts are mounted into the Hugo docs and blog.
export const sans = localFont({
  src: "../../public/fonts/bricolage-grotesque-latin-opsz-normal.woff2",
  weight: "200 800",
  style: "normal",
  variable: "--font-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const mono = localFont({
  src: "../../public/fonts/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  style: "normal",
  variable: "--font-mono",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
});
