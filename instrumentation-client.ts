// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { APP_ENV, IS_DEV, tracesSampleRate } from "@/lib/env";

// Single source of truth for client-side network blips (no connectivity, ad-blocker,
// brief API downtime) that we cannot act on. Covers Chrome/Edge, Safari, Firefox and
// React Native. Used both for `ignoreErrors` (direct errors) and `isNetworkError`
// (wrapped errors, e.g. ConnectError wrapping a TypeError: Failed to fetch).
const NETWORK_ERROR_PATTERNS = [
  "Failed to fetch",
  "Load failed",
  "Network request failed",
  "NetworkError when attempting to fetch resource",
];

// Browser noise that is never actionable on our side.
const BROWSER_NOISE_PATTERNS = [
  // Benign ResizeObserver notifications fired by some browsers.
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
];

// Walks the `error.cause` chain (bounded depth) so wrapped network errors are caught.
function isNetworkError(error: unknown): boolean {
  let current = error;

  for (let depth = 0; current && depth < 5; depth++) {
    const message =
      typeof current === "string"
        ? current
        : current instanceof Error
          ? current.message
          : "";

    if (NETWORK_ERROR_PATTERNS.some((pattern) => message.includes(pattern))) {
      return true;
    }

    current = current instanceof Error ? current.cause : undefined;
  }

  return false;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // No-op locally (and whenever the DSN is missing) instead of relying on an unset DSN.
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN && !IS_DEV,

  environment: APP_ENV,

  tracesSampleRate,

  debug: false,

  // Filters direct network errors by message. beforeSend below covers wrapped errors.
  ignoreErrors: [...NETWORK_ERROR_PATTERNS, ...BROWSER_NOISE_PATTERNS],

  integrations: [
    Sentry.feedbackIntegration({
      autoInject: false,
    }),
  ],

  beforeSend(event, hint) {
    if (isNetworkError(hint?.originalException)) {
      return null;
    }

    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
