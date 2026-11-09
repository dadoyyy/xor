import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@xor/shared-types",
    "@xor/shared-utils",
    "@xor/api-client",
    "@xor/design-tokens",
  ],
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
    staleTimes: {
      dynamic: 300,
      static: 600,
    },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
