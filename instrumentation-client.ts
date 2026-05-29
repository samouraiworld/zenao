// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { APP_ENV, tracesSampleRate } from "@/lib/env";

// Single source of truth for client-side network blips (no connectivity, ad-blocker,
// brief API downtime) that we cannot act on. Covers Chrome/Edge, Safari, Firefox and
// React Native. Browsers emit these as the *entire* error message; connect-es re-wraps
// them as `[code] <message>` (e.g. `[unavailable] Failed to fetch`) and keeps the
// original error as `.cause`. `isNetworkError` matches a pattern exactly or behind that
// prefix, so a genuine app error that merely *contains* the words (e.g. "Image Load
// failed", "Failed to fetch user config") is still reported.
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

const EXTENSION_URL_PREFIXES = [
  "chrome-extension://",
  "moz-extension://",
  "safari-extension://",
  "safari-web-extension://",
];

// Drops errors originating from browser extensions. Extensions inject into every
// page and produce noise we cannot act on. Signal: a stack frame whose file is
// served from an extension URL.
function isBrowserExtensionError(event: Sentry.ErrorEvent): boolean {
  const frames =
    event.exception?.values?.flatMap((v) => v.stacktrace?.frames ?? []) ?? [];
  return frames.some((f) =>
    EXTENSION_URL_PREFIXES.some((p) => f.filename?.startsWith(p)),
  );
}

// Drops JSON-RPC / EIP-1193 provider errors. Wallet extensions (Keplr, MetaMask…)
// inject into every page and reject with these codes when several wallets clash
// (e.g. `{ code: -32603, message: "Internal JSON-RPC error." }`). We ship no web3
// code, so any such rejection is third-party extension noise we cannot act on.
// A ConnectError uses gRPC codes (1-16), never these, so there is no false positive.
function isWalletProviderError(originalException: unknown): boolean {
  if (
    !originalException ||
    typeof originalException !== "object" ||
    originalException instanceof Error
  ) {
    return false;
  }
  const code = (originalException as { code?: unknown }).code;
  if (typeof code !== "number") {
    return false;
  }
  return (
    (code >= -32768 && code <= -32000) || // JSON-RPC 2.0 reserved (incl. -32603)
    [4001, 4100, 4200, 4900, 4901].includes(code) // EIP-1193 provider errors
  );
}

// True when `message` is exactly a network blip, or a connect-es-wrapped one
// (`[code] <message>`). Anchored rather than substring so unrelated app errors that
// merely contain the words are not swallowed.
function matchesNetworkPattern(message: string): boolean {
  return NETWORK_ERROR_PATTERNS.some(
    (pattern) => message === pattern || message.endsWith(`] ${pattern}`),
  );
}

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

    if (matchesNetworkPattern(message)) {
      return true;
    }

    current = current instanceof Error ? current.cause : undefined;
  }

  return false;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: APP_ENV,

  tracesSampleRate,

  debug: false,

  // Network errors (direct *and* wrapped) are handled by the anchored isNetworkError
  // check in beforeSend. Here we only drop browser noise like ResizeObserver.
  ignoreErrors: BROWSER_NOISE_PATTERNS,

  integrations: [
    Sentry.feedbackIntegration({
      autoInject: false,
    }),
  ],

  beforeSend(event, hint) {
    if (isNetworkError(hint?.originalException)) {
      return null;
    }

    if (isBrowserExtensionError(event)) {
      return null;
    }

    if (isWalletProviderError(hint?.originalException)) {
      return null;
    }

    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
