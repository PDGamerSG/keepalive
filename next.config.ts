import type { NextConfig } from "next";

// We deliberately use the classic (non-Cache-Components) model: every page reads
// live state from PayPal and the local store, so pages are dynamic by default.
const nextConfig: NextConfig = {
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
