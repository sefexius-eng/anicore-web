import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@consumet/extensions", "got-scraping"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "myanimelist.net",
      },
      {
        protocol: "https",
        hostname: "cdn.myanimelist.net",
      },
      {
        protocol: "https",
        hostname: "shikimori.one",
      },
      {
        protocol: "https",
        hostname: "desu.shikimori.one",
      },
    ],
  },
};

export default nextConfig;
