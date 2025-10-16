import matter from "gray-matter";
import { z } from "zod";

// Generic front-matter serialization/deserialization functions

export function serializeWithFrontMatter<T extends object>(
  main: string,
  data: T,
): string {
  return matter.stringify(main, data, {
    language: "json",
  });
}

export function deserializeWithFrontMatter<U extends z.ZodType>({
  serialized,
  schema,
  defaultValue,
  contentFieldName = "content",
}: {
  serialized: string;
  schema: U;
  defaultValue?: z.infer<U>;
  contentFieldName?: string;
}): z.infer<U> {
  let aContent = "";
  let aData: Record<string, unknown> = {};

  try {
    const { content, data } = matter(serialized, {
      language: "json",
    });
    aContent = content;
    aData = data;
  } catch (error) {
    if (error instanceof Error && error.message.includes("is not valid JSON")) {
      // If the error is due to invalid JSON, fallback trying  default "YAML" parsing
      const { content, data } = matter(serialized);
      aContent = content;
      aData = data;
    }
  }

  const result = schema.safeParse({ [contentFieldName]: aContent, ...aData });

  if (!result.success) {
    return defaultValue || ({} as z.infer<U>);
  }

  return result.data;
}
