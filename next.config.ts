import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // This allows production builds to finish even if there are type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // This prevents ESLint warnings/errors from breaking your build as well
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
