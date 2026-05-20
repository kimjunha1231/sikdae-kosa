import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.pstatic.net',
      },
      {
        protocol: 'http',
        hostname: '*.pstatic.net',
      }
    ],
  },
};

export default nextConfig;
