import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@consumet/extensions", "got-scraping"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "**",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
