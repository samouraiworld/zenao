import * as Sentry from "@sentry/nextjs";
import { OTLPHttpJsonTraceExporter, registerOTel } from "@vercel/otel";

export async function register() {
  registerOTel({
    serviceName: "zenao:frontend",
    traceExporter: new OTLPHttpJsonTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      headers: {
        "X-OTEL-TOKEN": process.env.OTEL_EXPORTER_OTLP_HEADERS_TOKEN,
      },
    }),
  });

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
