import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The cache is read by computed paths the file tracer can't follow, so ship the snapshot with every route.
  outputFileTracingIncludes: {
    "/**": ["./data/cache/**/*"],
  },
  images: {
    remotePatterns: [new URL("https://financialmodelingprep.com/image-stock/**")],
  },
  turbopack: {
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
