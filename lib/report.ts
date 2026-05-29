import * as Sentry from "@sentry/nextjs";
import { IS_DEV } from "@/lib/env";

export const captureException = (error: unknown) => {
  console.error("Error captured:", error);
  if (!IS_DEV) {
    Sentry.captureException(error, {
      fingerprint: [
        "{{ default }}",
        error instanceof Error ? error.message : "Unknown error",
      ],
    });
  }
};
