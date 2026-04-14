import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required when using a custom server
  experimental: {},
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
