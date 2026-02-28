/* eslint-disable local/kebab-case-filename */

import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import packageJson from "./package.json";

const withNextIntl = createNextIntlPlugin("./app/i18n/request.ts");

const nextConfig: NextConfig = {
  env: {
    NEXT_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_STRIPE_DASHBOARD_URL: "https://dashboard.stripe.com",
  },
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
      {
        source: "/tickets",
        destination: "/tickets/upcoming",
      },
      {
        source: "/community/:id",
        destination: "/community/:id/chat",
      },
      {
        source: "/profile/:userId",
        destination: "/profile/:userId/events",
      },
    ];
  },
  async headers() {
    // Build CSP directives — permissive enough for all integrations
    // (Clerk, Sentry, Pinata, Stripe, Plausible, Leaflet) while blocking XSS vectors
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.clerk.accounts.dev https://challenges.cloudflare.com https://plausible.io https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://*.sentry.io https://*.ingest.sentry.io https://*.pinata.cloud https://pinata.zenao.io https://api.stripe.com https://plausible.io wss://*.clerk.accounts.dev https://tile.openstreetmap.org https://nominatim.openstreetmap.org",
      "frame-src 'self' https://js.stripe.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
      "worker-src 'self' blob:",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: cspDirectives,
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(), geolocation=(self), payment=(self)",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "sentry",
  project: "zenao",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
  tunnelRoute: "/monitoring-tunnel",

  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
    disable:
      (process.env.NEXT_PUBLIC_ENV ?? "development") === "development",
  },
  bundleSizeOptimizations: {
    excludeReplayIframe: true,
    excludeReplayWorker: true,
    excludeDebugStatements: true,
    excludeReplayShadowDom: true,
  },
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
});

