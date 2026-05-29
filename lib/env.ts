// Centralised environment detection. Kept in one place so the parsing logic
// (which is easy to get wrong with `??`/`!==` precedence) lives only here.

// Only NEXT_PUBLIC_* vars are exposed to the browser, so NEXT_PUBLIC_ENV is the
// canonical environment name across client, server and edge runtimes.
// Fall back to NODE_ENV so a deploy that forgets to set NEXT_PUBLIC_ENV still
// behaves like production (Sentry enabled) instead of silently going dark.
export const APP_ENV =
  process.env.NEXT_PUBLIC_ENV ??
  (process.env.NODE_ENV === "production" ? "production" : "development");

export const IS_DEV = APP_ENV === "development";
export const IS_PROD = APP_ENV === "production";

// Trace sampling: full traces locally/preview, low in production to control quota.
export const tracesSampleRate = IS_PROD ? 0.1 : 1.0;
