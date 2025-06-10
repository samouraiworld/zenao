import * as Sentry from "@sentry/nextjs";

export const captureException = (error: unknown) => {
  console.error("Error captured:", error);
  if (process.env.NEXT_PUBLIC_ENV ?? "development" !== "development") {
    Sentry.captureException(error);
  }
};
