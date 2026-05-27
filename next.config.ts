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
      },
      {
        protocol: 'https',
        hostname: '*.naver.com',
      },
      {
        protocol: 'http',
        hostname: '*.naver.com',
      },
      {
        protocol: 'https',
        hostname: '*.baemin.com',
      },
      {
        protocol: 'http',
        hostname: '*.baemin.com',
      },
      {
        protocol: 'https',
        hostname: '*.smartbaedal.com',
      },
      {
        protocol: 'http',
        hostname: '*.smartbaedal.com',
      }
    ],
  },
};

export default nextConfig;
