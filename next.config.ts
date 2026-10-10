import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static output (./out) for Cloudflare Pages or any static host.
  output: "export",
  // Each route is emitted as /route/index.html, which static hosts serve reliably.
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
