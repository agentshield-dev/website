import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.CF_PAGES === "1" ? "export" : undefined,
  distDir: process.env.CF_PAGES === "1" ? "out" : ".next",
  typescript: {
    tsconfigPath: process.env.CF_PAGES === "1" ? "tsconfig.cloudflare.json" : "tsconfig.json",
  },
  images: {
    unoptimized: process.env.CF_PAGES === "1",
  },
  trailingSlash: true,
  ...(process.env.NODE_ENV === "development"
    ? {
        async rewrites() {
          return [
            {
              source: "/blog/:file.:ext",
              destination: "http://localhost:1314/blog/:file.:ext",
            },
            {
              source: "/blog/:path*/:file.:ext",
              destination: "http://localhost:1314/blog/:path*/:file.:ext",
            },
            {
              source: "/blog/",
              destination: "http://localhost:1314/blog/",
            },
            {
              source: "/blog/:path*/",
              destination: "http://localhost:1314/blog/:path*/",
            },
            {
              source: "/docs/:file.:ext",
              destination: "http://localhost:1313/docs/:file.:ext",
            },
            {
              source: "/docs/:path*/:file.:ext",
              destination: "http://localhost:1313/docs/:path*/:file.:ext",
            },
            {
              source: "/docs/",
              destination: "http://localhost:1313/docs/",
            },
            {
              source: "/docs/:path*/",
              destination: "http://localhost:1313/docs/:path*/",
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
