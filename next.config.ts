import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./app/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverComponentsHmrCache: false, // defaults to true
  },
  async rewrites() {
    return [
      {
        source: "/discover",
        destination: "/discover/upcoming",
      },
    ];
  },
};

export default withNextIntl(nextConfig);
