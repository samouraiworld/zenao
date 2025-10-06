import matter from "gray-matter";
import { z } from "zod";

// Generic front-matter serialization/deserialization functions

export function serializeWithFrontMatter<T extends object>(
  main: string,
  data: T,
): string {
  return matter.stringify(main, data);
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
  const { content, data } = matter(serialized);
  const result = schema.safeParse({ [contentFieldName]: content, ...data });

  if (!result.success) {
    return defaultValue || ({} as z.infer<U>);
  }

  return result.data;
}
