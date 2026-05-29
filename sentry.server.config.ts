// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { tracesSampleRate } from "@/lib/env";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment:
    process.env.NEXT_PUBLIC_ENV ?? process.env.VERCEL_ENV ?? "development",

  // Sampled lower in production to control quota; see lib/env.ts.
  tracesSampleRate,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
  skipOpenTelemetrySetup: true,
});
