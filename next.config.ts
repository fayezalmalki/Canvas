import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@crawlee/playwright", "@crawlee/browser-pool", "@crawlee/browser", "@crawlee/core", "playwright"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
