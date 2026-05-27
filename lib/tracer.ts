import { trace } from "@opentelemetry/api";

export const tracer = trace.getTracer("custom-tracer");

export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const span = tracer.startSpan(name);

  try {
    return await fn();
  } finally {
    span.end();
  }
}
