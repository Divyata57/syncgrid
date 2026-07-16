import type { NextConfig } from "next";

const nextConfig: any = {
  /* config options here */
  typescript: {
    // This allows production builds to finish even if there are type errors
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig as NextConfig;
