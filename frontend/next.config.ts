import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone', // For Docker deployment
  typescript: {
    ignoreBuildErrors: true, // Temporary for testing
  },
  eslint: {
    ignoreDuringBuilds: true, // Temporary for testing
  },
};

export default nextConfig;
